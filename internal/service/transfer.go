package service

import (
	"errors"
	"time"

	"patrimonio/internal/domain"

	"github.com/google/uuid"
)

type transferRequestService struct {
	repo        domain.TransferRequestRepository
	assetRepo   domain.AssetRepository
	custodySvc  domain.CustodyService
	movementSvc domain.MovementService
	userRepo    domain.UserRepository
}

func NewTransferRequestService(
	repo domain.TransferRequestRepository,
	assetRepo domain.AssetRepository,
	custodySvc domain.CustodyService,
	movementSvc domain.MovementService,
	userRepo domain.UserRepository,
) domain.TransferRequestService {
	return &transferRequestService{
		repo: repo, assetRepo: assetRepo, custodySvc: custodySvc, movementSvc: movementSvc, userRepo: userRepo,
	}
}

func (s *transferRequestService) List(page, limit int, status domain.TransferRequestStatus) ([]*domain.TransferRequest, int64, error) {
	return s.repo.FindAll(page, limit, status, nil)
}

func (s *transferRequestService) ListMine(page, limit int, userID uuid.UUID) ([]*domain.TransferRequest, int64, error) {
	return s.repo.FindAll(page, limit, "", &userID)
}

func (s *transferRequestService) Request(input domain.CreateTransferRequestInput, requestedBy uuid.UUID) (*domain.TransferRequest, error) {
	if input.ToUserID == requestedBy {
		return nil, errors.New("usuário destino deve ser diferente do usuário atual")
	}
	if !s.custodySvc.UserHasActiveCustody(input.AssetID, requestedBy) {
		return nil, errors.New("bem não pertence à carga ativa do usuário")
	}
	if _, err := s.userRepo.FindByID(input.ToUserID); err != nil {
		return nil, errors.New("usuário destino não encontrado")
	}

	asset, err := s.assetRepo.FindByID(input.AssetID)
	if err != nil {
		return nil, errors.New("bem não encontrado")
	}
	policy := asset.TransferPolicy
	if policy == "" {
		policy = domain.TransferRequiresApproval
	}

	request := &domain.TransferRequest{
		AssetID:     input.AssetID,
		FromUserID:  requestedBy,
		ToUserID:    input.ToUserID,
		Policy:      policy,
		Reason:      input.Reason,
		RequestedAt: time.Now(),
	}

	switch policy {
	case domain.TransferDirect, domain.TransferDirectNotify:
		request.Status = domain.TransferStatusPendingRecipientAcceptance
		request.GestorNotified = policy == domain.TransferDirectNotify
	case domain.TransferRequiresApproval:
		request.Status = domain.TransferStatusPendingManagerApproval
	default:
		return nil, errors.New("política de transferência inválida")
	}

	if err := s.repo.Create(request); err != nil {
		return nil, err
	}
	return request, nil
}

func (s *transferRequestService) Approve(id, reviewedBy uuid.UUID, notes string) (*domain.TransferRequest, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("solicitação não encontrada")
	}
	if !isPendingManagerApproval(request.Status) {
		return nil, errors.New("somente solicitações pendentes podem ser aprovadas")
	}
	if !s.custodySvc.UserHasActiveCustody(request.AssetID, request.FromUserID) {
		return nil, errors.New("bem não está mais na carga do solicitante")
	}

	now := time.Now()
	request.Status = domain.TransferStatusPendingRecipientAcceptance
	request.ReviewedByID = &reviewedBy
	request.ReviewedAt = &now
	request.ReviewNotes = notes
	return request, s.repo.Update(request)
}

func (s *transferRequestService) Reject(id, reviewedBy uuid.UUID, notes string) (*domain.TransferRequest, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("solicitação não encontrada")
	}
	if !isPendingManagerApproval(request.Status) {
		return nil, errors.New("somente solicitações pendentes podem ser rejeitadas")
	}

	now := time.Now()
	request.Status = domain.TransferStatusRejected
	request.ReviewedByID = &reviewedBy
	request.ReviewedAt = &now
	request.ReviewNotes = notes
	return request, s.repo.Update(request)
}

func (s *transferRequestService) Accept(id, userID uuid.UUID, notes string) (*domain.TransferRequest, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("solicitação não encontrada")
	}
	if request.ToUserID != userID {
		return nil, errors.New("somente o usuário destino pode aceitar a transferência")
	}
	if !isPendingRecipientAcceptance(request.Status) {
		return nil, errors.New("somente transferências aguardando aceite podem ser aceitas")
	}
	if !s.custodySvc.UserHasActiveCustody(request.AssetID, request.FromUserID) {
		return nil, errors.New("bem não está mais na carga do solicitante")
	}

	now := time.Now()
	request.Status = domain.TransferStatusExecuted
	request.RecipientAt = &now
	request.RecipientNotes = notes
	if err := s.repo.ExecuteAcceptedTransfer(request, userID); err != nil {
		return nil, err
	}
	return request, nil
}

func (s *transferRequestService) Decline(id, userID uuid.UUID, notes string) (*domain.TransferRequest, error) {
	request, err := s.repo.FindByID(id)
	if err != nil {
		return nil, errors.New("solicitação não encontrada")
	}
	if request.ToUserID != userID {
		return nil, errors.New("somente o usuário destino pode recusar a transferência")
	}
	if !isPendingRecipientAcceptance(request.Status) {
		return nil, errors.New("somente transferências aguardando aceite podem ser recusadas")
	}

	now := time.Now()
	request.Status = domain.TransferStatusRejected
	request.RecipientAt = &now
	request.RecipientNotes = notes
	return request, s.repo.Update(request)
}

func isPendingManagerApproval(status domain.TransferRequestStatus) bool {
	return status == domain.TransferStatusPendingManagerApproval || status == domain.TransferStatusPending
}

func isPendingRecipientAcceptance(status domain.TransferRequestStatus) bool {
	return status == domain.TransferStatusPendingRecipientAcceptance || status == domain.TransferStatusApproved
}
