TEAM_CHANNELS: dict[str, dict[str, str]] = {
    "network": {
        "L1": "#inc-network-l1",
        "L2": "#inc-network-l2",
        "L3": "#inc-network-l3",
    },
    "performance": {
        "L1": "#inc-performance-l1",
        "L2": "#inc-performance-l2",
        "L3": "#inc-performance-l3",
    },
    "database": {
        "L1": "#inc-database-l1",
        "L2": "#inc-database-l2",
        "L3": "#inc-database-l3",
    },
    "application": {
        "L1": "#inc-application-l1",
        "L2": "#inc-application-l2",
        "L3": "#inc-application-l3",
    },
    "deployment": {
        "L1": "#inc-deployment-l1",
        "L2": "#inc-deployment-l2",
        "L3": "#inc-deployment-l3",
    },
    "storage": {
        "L1": "#inc-storage-l1",
        "L2": "#inc-storage-l2",
        "L3": "#inc-storage-l3",
    },
    "hardware": {
        "L1": "#inc-hardware-l1",
        "L2": "#inc-hardware-l2",
        "L3": "#inc-hardware-l3",
    },
    "platform": {
        "L1": "#inc-platform-l1",
        "L2": "#inc-platform-l2",
        "L3": "#inc-platform-l3",
    },
}

ESCALATION_MATRIX: dict[str, str] = {
    "P1": "L3",
    "P2": "L2",
    "P3": "L1",
    "P4": "L1",
    "P5": "L1",
}


FALLBACK_CHANNEL: str = "#inc-triage-fallback"
VALID_TEAMS: frozenset[str] = frozenset(TEAM_CHANNELS.keys())
