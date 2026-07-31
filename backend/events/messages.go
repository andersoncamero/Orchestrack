package events

// Subjects NATS para comunicación entre servicios.
const (
	// Registry
	SubjectDockerServiceHeartbeat = "registry.orchestrack-agent.heartbeat"

	// Command subjects (placeholders: replace {id} or {hostname})
	SubjectCommandListContainers   = "commands.orchestrack-agent.{identifier}.containers.list"
	SubjectCommandGetContainer     = "commands.orchestrack-agent.{identifier}.containers.get"
	SubjectCommandCreateContainer  = "commands.orchestrack-agent.{identifier}.containers.create"
	SubjectCommandStartContainer   = "commands.orchestrack-agent.{identifier}.containers.start"
	SubjectCommandStopContainer    = "commands.orchestrack-agent.{identifier}.containers.stop"
	SubjectCommandRestartContainer = "commands.orchestrack-agent.{identifier}.containers.restart"
	SubjectCommandRenameContainer  = "commands.orchestrack-agent.{identifier}.containers.rename"
	SubjectCommandRemoveContainer  = "commands.orchestrack-agent.{identifier}.containers.remove"
	SubjectCommandGetContainerLogs = "commands.orchestrack-agent.{identifier}.containers.logs"
	SubjectCommandGetContainerTopology = "commands.orchestrack-agent.{identifier}.containers.topology"
	SubjectCommandListImages       = "commands.orchestrack-agent.{identifier}.images.list"
	SubjectCommandPullImage        = "commands.orchestrack-agent.{identifier}.images.pull"
	SubjectCommandRemoveImage      = "commands.orchestrack-agent.{identifier}.images.remove"

	// System/package command subjects
	SubjectCommandListPackages    = "commands.orchestrack-agent.{identifier}.system.packages.list"
	SubjectCommandRefreshPackages = "commands.orchestrack-agent.{identifier}.system.packages.refresh"
	SubjectCommandUpgradePackages = "commands.orchestrack-agent.{identifier}.system.packages.upgrade"
	SubjectCommandRemovePackages  = "commands.orchestrack-agent.{identifier}.system.packages.remove"
	SubjectCommandGetSystemInfo   = "commands.orchestrack-agent.{identifier}.system.info"

	// Process command subjects
	SubjectCommandSearchProcesses = "commands.orchestrack-agent.{identifier}.processes.search"

	// Event subjects (placeholders: replace {id})
	SubjectContainerCreated     = "events.orchestrack-agent.{identifier}.container.created"
	SubjectContainerStarted     = "events.orchestrack-agent.{identifier}.container.started"
	SubjectContainerStopped     = "events.orchestrack-agent.{identifier}.container.stopped"
	SubjectContainerRestarted   = "events.orchestrack-agent.{identifier}.container.restarted"
	SubjectContainerRenamed     = "events.orchestrack-agent.{identifier}.container.renamed"
	SubjectContainerRemoved     = "events.orchestrack-agent.{identifier}.container.removed"
	SubjectContainerEvent       = "events.orchestrack-agent.{identifier}.container_event"
	SubjectContainerEvidence    = "events.orchestrack-agent.{identifier}.evidence"
	SubjectContainerEventsAll   = "events.orchestrack-agent.>"

	// Image event subjects
	SubjectImagePulled  = "events.orchestrack-agent.{identifier}.image.pulled"
	SubjectImageRemoved = "events.orchestrack-agent.{identifier}.image.removed"

	// Agent event subjects
	SubjectAgentStatus = "events.orchestrack-agent.{identifier}.status"
)

// CommandSubject devuelve el subject completo para un comando dirigido a una instancia.
func CommandSubject(template, identifier string) string {
	return replaceIdentifier(template, identifier)
}

// EventSubject devuelve el subject completo para un evento de una instancia.
func EventSubject(template, serviceID string) string {
	return replaceIdentifier(template, serviceID)
}

func replaceIdentifier(template, identifier string) string {
	// Reemplaza el placeholder {identifier}
	result := ""
	for i := 0; i < len(template); i++ {
		if i+13 <= len(template) && template[i:i+13] == "{identifier}" {
			result += identifier
			i += 12
			continue
		}
		result += string(template[i])
	}
	return result
}
