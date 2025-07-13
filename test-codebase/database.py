"""Database connection utilities"""
import sqlite3
from typing import Optional, Dict, Any

class DatabaseManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.connection: Optional[sqlite3.Connection] = None
    
    def connect(self) -> sqlite3.Connection:
        """Establish database connection"""
        if not self.connection:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row
        return self.connection
    
    def execute_query(self, query: str, params: Dict[str, Any] = None) -> list:
        """Execute SQL query and return results"""
        conn = self.connect()
        cursor = conn.cursor()
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
            
        return cursor.fetchall()
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None