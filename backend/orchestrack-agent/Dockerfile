FROM golang:1.25.0-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o /app/bin/orchestrack-agent ./orchestrack-agent/main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/bin/orchestrack-agent .

EXPOSE 50051

CMD ["./orchestrack-agent"]
