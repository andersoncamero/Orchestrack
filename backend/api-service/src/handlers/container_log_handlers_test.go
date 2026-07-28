package handlers

import (
	"net/url"
	"testing"
)

func TestParseLogsOptions(t *testing.T) {
	cases := []struct {
		name           string
		query          string
		wantTail       uint32
		wantTimestamps bool
		wantStdout     bool
		wantStderr     bool
	}{
		{"valores por defecto sin query", "", 100, false, true, true},
		{"tail personalizado", "tail=50", 50, false, true, true},
		{"tail inválido mantiene el defecto", "tail=abc", 100, false, true, true},
		{"tail cero es válido (todas las líneas)", "tail=0", 0, false, true, true},
		{"timestamps activado", "timestamps=true", 100, true, true, true},
		{"timestamps con otro valor queda en false", "timestamps=1", 100, false, true, true},
		{"stdout desactivado", "stdout=false", 100, false, false, true},
		{"stderr desactivado", "stderr=false", 100, false, true, false},
		{"combinación completa", "tail=200&timestamps=true&stdout=false&stderr=true", 200, true, false, true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			q, err := url.ParseQuery(tc.query)
			if err != nil {
				t.Fatalf("ParseQuery(%q) error: %v", tc.query, err)
			}
			tail, timestamps, stdout, stderr := parseLogsOptions(q)
			if tail != tc.wantTail {
				t.Errorf("tail = %d, want %d", tail, tc.wantTail)
			}
			if timestamps != tc.wantTimestamps {
				t.Errorf("timestamps = %v, want %v", timestamps, tc.wantTimestamps)
			}
			if stdout != tc.wantStdout {
				t.Errorf("stdout = %v, want %v", stdout, tc.wantStdout)
			}
			if stderr != tc.wantStderr {
				t.Errorf("stderr = %v, want %v", stderr, tc.wantStderr)
			}
		})
	}
}

func TestSanitizeLogLine(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  string
	}{
		{"línea limpia no cambia", "2026-07-28 INFO server started", "2026-07-28 INFO server started"},
		{"elimina bytes nulos", "panic\x00: runtime error\x00", "panic: runtime error"},
		{"elimina cabecera multiplexada stdout", "\x01\x00\x00\x00\x00\x00\x00\x10hello world", "hello world"},
		{"elimina cabecera multiplexada stderr", "\x02\x00\x00\x00\x00\x00\x00\x20fatal error", "fatal error"},
		{"elimina cabecera en medio de la línea", "start\x01\x00\x00\x00\x00\x00\x00\x05end", "startend"},
		{"cabecera truncada solo pierde los nulos", "\x01\x00\x00\x00abc", "\x01abc"},
		{"línea vacía", "", ""},
		{"solo bytes nulos", "\x00\x00\x00", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := sanitizeLogLine(tc.input); got != tc.want {
				t.Errorf("sanitizeLogLine(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

func TestSanitizeLogLines(t *testing.T) {
	input := []string{
		"\x01\x00\x00\x00\x00\x00\x00\x08clean line",
		"already\x00 clean",
	}
	want := []string{"clean line", "already clean"}

	got := sanitizeLogLines(input)
	if len(got) != len(want) {
		t.Fatalf("sanitizeLogLines devolvió %d líneas, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("línea %d = %q, want %q", i, got[i], want[i])
		}
	}
}
