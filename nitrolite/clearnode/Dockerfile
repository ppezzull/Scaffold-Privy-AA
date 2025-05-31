FROM golang:1.24.3-alpine AS builder

WORKDIR /build
ENV GOOS=linux \
    GOARCH=amd64 \
    CGO_ENABLED=1

RUN apk add --no-cache gcc musl-dev sqlite-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o ./bin/clearnode .

FROM alpine

RUN addgroup -g 1001 -S clearnode
RUN adduser -S clearnode -u 1001 -G clearnode

USER clearnode

COPY --from=builder /build/bin /bin

EXPOSE 8000 4242

CMD ["clearnode"]
