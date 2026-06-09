"""Pluggable executor registry — operations bind to an executor by name."""
from app.executors.base import EXECUTORS, ExecutorResult, get_executor

__all__ = ["EXECUTORS", "ExecutorResult", "get_executor"]
