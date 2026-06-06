.PHONY: run build migrate migrate-down seed tidy lint test

run:
	go run ./cmd/server/...

build:
	go build -o bin/server ./cmd/server/...

tidy:
	go mod tidy

migrate:
	go run ./cmd/server/... migrate up

migrate-down:
	go run ./cmd/server/... migrate down

seed:
	go run ./cmd/server/... seed

test:
	go test ./... -v

lint:
	golangci-lint run

front-dev:
	cd frontend && npm run dev

front-build:
	cd frontend && npm run build

front-install:
	cd frontend && npm install
