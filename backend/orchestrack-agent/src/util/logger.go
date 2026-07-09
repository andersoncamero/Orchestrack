package util

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
)

// Códigos ANSI para colores en terminal
const (
	ansiReset  = "\033[0m"
	ansiBold   = "\033[1m"
	ansiGray   = "\033[90m"
	ansiGreen  = "\033[32m"
	ansiYellow = "\033[33m"
	ansiRed    = "\033[31m"
	ansiCyan   = "\033[36m"
)

// terminalHandler es un slog.Handler que imprime mensajes legibles con colores en terminal.
type terminalHandler struct {
	level  slog.Level
	writer io.Writer
	attrs  []slog.Attr
}

func (h *terminalHandler) Enabled(_ context.Context, level slog.Level) bool {
	return level >= h.level
}

func (h *terminalHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]slog.Attr, len(h.attrs)+len(attrs))
	copy(newAttrs, h.attrs)
	copy(newAttrs[len(h.attrs):], attrs)
	return &terminalHandler{level: h.level, writer: h.writer, attrs: newAttrs}
}

func (h *terminalHandler) WithGroup(_ string) slog.Handler {
	return h
}

func (h *terminalHandler) Handle(_ context.Context, r slog.Record) error {
	// Símbolo e color según nivel
	var symbol, levelColor string
	switch r.Level {
	case slog.LevelDebug:
		symbol = "·"
		levelColor = ansiGray
	case slog.LevelInfo:
		symbol = "→"
		levelColor = ansiCyan
	case slog.LevelWarn:
		symbol = "⚠"
		levelColor = ansiYellow
	case slog.LevelError:
		symbol = "✗"
		levelColor = ansiRed
	default:
		symbol = "·"
		levelColor = ansiGray
	}

	// Construir pares clave=valor de los atributos
	var extras []string
	for _, attr := range h.attrs {
		extras = append(extras, fmt.Sprintf("%s%s%s=%v", ansiGray, attr.Key, ansiReset, attr.Value))
	}
	r.Attrs(func(a slog.Attr) bool {
		extras = append(extras, fmt.Sprintf("%s%s%s=%v", ansiGray, a.Key, ansiReset, a.Value))
		return true
	})

	suffix := ""
	if len(extras) > 0 {
		suffix = "  " + strings.Join(extras, "  ")
	}

	line := fmt.Sprintf("%s%s%s %s%s%s%s\n",
		levelColor, symbol, ansiReset,
		ansiBold, r.Message, ansiReset,
		suffix,
	)

	_, err := fmt.Fprint(h.writer, line)
	return err
}

// NewLogger crea un logger con el nivel indicado y salida legible en terminal.
func NewLogger(level string) *slog.Logger {
	var logLevel slog.Level
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	handler := &terminalHandler{level: logLevel, writer: os.Stdout}
	return slog.New(handler)
}

