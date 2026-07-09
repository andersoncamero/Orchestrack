package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/docker/docker/errdefs"
	"github.com/go/orchestrack/backend/api-service/src/commander"
	"github.com/go/orchestrack/backend/api-service/src/ports"
	"github.com/go/orchestrack/backend/proto/docker"
	"github.com/gorilla/mux"
)

const dockerHubSearchURL = "https://hub.docker.com/v2/search/repositories/"

// dockerHubSearchResponse representa la respuesta de Docker Hub.
type dockerHubSearchResponse struct {
	Count   int `json:"count"`
	Results []struct {
		RepoName        string `json:"repo_name"`
		ShortDescription string `json:"short_description"`
		StarCount       int    `json:"star_count"`
		PullCount       int64  `json:"pull_count"`
		IsOfficial      bool   `json:"is_official"`
		IsAutomated     bool   `json:"is_automated"`
	} `json:"results"`
}

// ImageSearchResult es un resultado de búsqueda formateado para el frontend.
type ImageSearchResult struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	StarCount   int    `json:"star_count"`
	PullCount   int64  `json:"pull_count"`
	IsOfficial  bool   `json:"is_official"`
	DefaultTag  string `json:"default_tag"`
}

// ImageSearchResponse es la respuesta del api-service.
type ImageSearchResponse struct {
	Query   string              `json:"query"`
	Total   int                 `json:"total"`
	Images  []ImageSearchResult `json:"images"`
}

// ListImagesHandler lista las imágenes Docker de una instancia.
func ListImagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		all := r.URL.Query().Get("all") == "true"

		resp, err := commander.ListImages(r.Context(), identifier, hostnameRegistry(s), &docker.ListImagesRequest{All: all})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// PullImageHandler descarga una imagen en una instancia.
func PullImageHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]

		var body struct {
			Image string `json:"image"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		resp, err := commander.PullImage(r.Context(), identifier, hostnameRegistry(s), &docker.PullImageRequest{Image: body.Image})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// RemoveImageHandler elimina una imagen de una instancia.
func RemoveImageHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identifier := mux.Vars(r)["identifier"]
		id := mux.Vars(r)["id"]
		force := r.URL.Query().Get("force") == "true"
		pruneChildren := r.URL.Query().Get("prune") == "true"

		resp, err := commander.RemoveImage(r.Context(), identifier, hostnameRegistry(s), &docker.RemoveImageRequest{
			Id:            id,
			Force:         force,
			PruneChildren: pruneChildren,
		})
		if err != nil {
			status := http.StatusInternalServerError
			if errdefs.IsNotFound(err) {
				status = http.StatusNotFound
			}
			writeError(w, status, fmt.Sprintf("failed to remove image: %v", err))
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

// SearchImagesHandler busca imágenes públicas en Docker Hub.
func SearchImagesHandler(s ports.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			writeError(w, http.StatusBadRequest, "missing query parameter 'q'")
			return
		}

		limitStr := r.URL.Query().Get("limit")
		limit := 10
		if limitStr != "" {
			if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 50 {
				limit = parsed
			}
		}

		u, err := url.Parse(dockerHubSearchURL)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		q := u.Query()
		q.Set("query", query)
		q.Set("page_size", strconv.Itoa(limit))
		u.RawQuery = q.Encode()

		client := &http.Client{Timeout: 10 * time.Second}
		req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		req.Header.Set("Accept", "application/json")

		hubResp, err := client.Do(req)
		if err != nil {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("docker hub request failed: %v", err))
			return
		}
		defer hubResp.Body.Close()

		if hubResp.StatusCode != http.StatusOK {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("docker hub returned status %d", hubResp.StatusCode))
			return
		}

		var searchResp dockerHubSearchResponse
		if err := json.NewDecoder(hubResp.Body).Decode(&searchResp); err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to decode docker hub response: %v", err))
			return
		}

		results := make([]ImageSearchResult, 0, len(searchResp.Results))
		for _, item := range searchResp.Results {
			results = append(results, ImageSearchResult{
				Name:        item.RepoName,
				Description: item.ShortDescription,
				StarCount:   item.StarCount,
				PullCount:   item.PullCount,
				IsOfficial:  item.IsOfficial,
				DefaultTag:  "latest",
			})
		}

		writeJSON(w, http.StatusOK, ImageSearchResponse{
			Query:  query,
			Total:  searchResp.Count,
			Images: results,
		})
	}
}
