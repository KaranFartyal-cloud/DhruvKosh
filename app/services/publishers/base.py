from abc import ABC, abstractmethod
from typing import Optional
from dataclasses import dataclass

@dataclass
class PublishResult:
    success: bool
    external_id: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None

class BasePublisher(ABC):
    @abstractmethod
    async def publish(self, text: str, image_path: Optional[str] = None) -> PublishResult:
        pass
