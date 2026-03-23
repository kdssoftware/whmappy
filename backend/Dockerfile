# Build Stage
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server cmd/server/main.go

# Run Stage
FROM alpine:latest
WORKDIR /
COPY --from=builder /server /server
# Expose the port your Fiber app is listening on
EXPOSE 8080
CMD ["/server"]
