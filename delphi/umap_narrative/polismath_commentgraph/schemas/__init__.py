"""
Schema definitions for the Polis comment graph microservice.
"""

from .dynamo_models import (
    ConversationMeta,
    CommentEmbedding,
    CommentCluster,
    ClusterTopic,
    UMAPGraphEdge,
    # CommentText - removed to avoid data duplication
    CommentRequest,
    EmbeddingResponse,
    ClusterAssignmentResponse,
    SimilarCommentResponse,
    RoutingResponse,
    VisualizationDataResponse
)

__all__ = [
    'ConversationMeta',
    'CommentEmbedding',
    'CommentCluster',
    'ClusterTopic',
    'UMAPGraphEdge',
    # 'CommentText' - removed to avoid data duplication
    'CommentRequest',
    'EmbeddingResponse',
    'ClusterAssignmentResponse',
    'SimilarCommentResponse',
    'RoutingResponse',
    'VisualizationDataResponse'
]