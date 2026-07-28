package docker

import "testing"

func TestSplitLogLines(t *testing.T) {
	cases := []struct {
		name   string
		output string
		want   []string
	}{
		{"salida vacía", "", []string{}},
		{"una línea sin salto final", "hello", []string{"hello"}},
		{"descarta salto de línea final", "line1\nline2\n", []string{"line1", "line2"}},
		{"conserva líneas vacías intermedias", "line1\n\nline3\n", []string{"line1", "", "line3"}},
		{"varios saltos finales", "line1\n\n\n", []string{"line1"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := splitLogLines(tc.output)
			if len(got) != len(tc.want) {
				t.Fatalf("splitLogLines(%q) devolvió %d líneas (%v), want %d (%v)", tc.output, len(got), got, len(tc.want), tc.want)
			}
			for i := range tc.want {
				if got[i] != tc.want[i] {
					t.Errorf("línea %d = %q, want %q", i, got[i], tc.want[i])
				}
			}
		})
	}
}
