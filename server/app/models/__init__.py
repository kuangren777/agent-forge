"""Import all models so Base.metadata is fully populated."""
from app.models.base import Base
from app.models.identity import Role, Session, Tenant, User, UserRole
from app.models.sources import (
    DataSource,
    DiscoveredChain,
    DiscoveredEntity,
    DiscoveredOperation,
    DiscoveredRule,
    ExplorationEvent,
    ExplorationJob,
)
from app.models.registry import (
    Operation,
    OperationPermission,
    Plugin,
    PluginRegistration,
)
from app.models.business import BizRecord
from app.models.chat import ChatMessage, ChatSession, ExecutionPlan, PlanStep
from app.models.execution import ApprovalRequest, ApprovalVote, Execution
from app.models.audit import (
    AuditEvent,
    DataflowEdge,
    DataflowNode,
    LLMRun,
    Trace,
)

__all__ = [
    "Base",
    "Tenant", "User", "Role", "UserRole", "Session",
    "DataSource", "ExplorationJob", "ExplorationEvent",
    "DiscoveredEntity", "DiscoveredOperation", "DiscoveredRule", "DiscoveredChain",
    "Operation", "OperationPermission", "Plugin", "PluginRegistration",
    "BizRecord",
    "ChatSession", "ChatMessage", "ExecutionPlan", "PlanStep",
    "ApprovalRequest", "ApprovalVote", "Execution",
    "Trace", "AuditEvent", "DataflowNode", "DataflowEdge", "LLMRun",
]
