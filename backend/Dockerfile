# ให้เวอร์ชัน Go ตรงกับบรรทัด "go 1.xx" ใน go.mod (ถ้า go.mod ใหม่กว่า ให้ปรับเลขตรงนี้)
FROM golang:1.26.8 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/api

FROM gcr.io/distroless/static
COPY --from=build /app /app
EXPOSE 8080
CMD ["/app"]
