# backend/app/core/logging_config.py
"""
Centralized logging configuration for VisionX Deepfake Detection

Features:
- RotatingFileHandler with 10MB max per file
- 5 backup files (automatically zipped)
- Both console and file logging
- Structured log format with timestamps
"""

import logging
import logging.handlers
import os
from pathlib import Path
from datetime import datetime


def setup_logging(log_level: str = "INFO") -> None:
    """
    Setup logging configuration for the entire application.
    
    Args:
        log_level: Minimum log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    
    # Create logs directory in project root
    project_root = Path(__file__).parent.parent.parent.parent  # Go up 4 levels from core/
    logs_dir = project_root / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    # Log file path
    log_file = logs_dir / "visionx.log"
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_formatter = logging.Formatter(
        fmt='%(levelname)s - %(name)s - %(message)s'
    )
    
    # Clear any existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Set log level
    log_level_obj = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(log_level_obj)
    
    # Console Handler (keeps existing console output)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level_obj)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File Handler with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        filename=log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(log_level_obj)
    file_handler.setFormatter(detailed_formatter)
    root_logger.addHandler(file_handler)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info("🚀 VisionX Logging System Initialized")
    logger.info(f"   Log level: {log_level}")
    logger.info(f"   Log file: {log_file}")
    logger.info(f"   Console logging: ENABLED")
    logger.info(f"   File rotation: 10MB per file, 5 backups")
    logger.info("=" * 60)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Usually __name__ from the calling module
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


def log_system_info() -> None:
    """Log system information for debugging."""
    logger = logging.getLogger(__name__)
    
    try:
        import platform
        import sys
        
        logger.info("System Information:")
        logger.info(f"   Platform: {platform.platform()}")
        logger.info(f"   Python: {sys.version}")
        logger.info(f"   Working Directory: {os.getcwd()}")
        
    except Exception as e:
        logger.warning(f"Could not log system info: {e}")
