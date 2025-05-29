import os
import logging
from dotenv import load_dotenv
import mysql.connector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def remove_unwanted_columns():
    """
    Remove unwanted columns from the database tables:
    - file_hash
    - processed_date
    - duplicate_of
    - batch_id
    - years_of_experience (from skills table)
    - last_used (from skills table)
    """
    # Database configuration
    DB_USER = os.getenv('MYSQL_USER')
    DB_PASSWORD = os.getenv('MYSQL_PASSWORD')
    DB_HOST = os.getenv('MYSQL_HOST', 'localhost')
    DB_PORT = os.getenv('MYSQL_PORT', '3306')
    DB_NAME = os.getenv('MYSQL_DATABASE')
    
    # Tables that might contain these columns
    tables_to_check = ['skills', 'education', 'work_experiences']
    
    # Columns to remove with specific table mappings
    columns_to_remove = {
        'education': ['gpa'],
        'work_experiences': ['description'],
        'skills': ['years_experience']
    }
    
    try:
        # Connect to the database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT
        )
        cursor = conn.cursor()
        
        # For each table, check if the columns exist and remove them
        for table in tables_to_check:
            # Check if table exists
            cursor.execute(f"SHOW TABLES LIKE '{table}'")
            if not cursor.fetchone():
                logger.info(f"Table {table} does not exist, skipping")
                continue
            
            # Get existing columns in the table
            cursor.execute(f"DESCRIBE {table}")
            existing_columns = [col[0] for col in cursor.fetchall()]
            
            # Get the columns to remove for this specific table
            cols_to_remove = columns_to_remove.get(table, [])
            
            # Remove unwanted columns if they exist
            for column in cols_to_remove:
                if column in existing_columns:
                    logger.info(f"Removing column {column} from table {table}")
                    cursor.execute(f"ALTER TABLE {table} DROP COLUMN {column}")
                    conn.commit()
                    logger.info(f"Successfully removed column {column} from table {table}")
                else:
                    logger.info(f"Column {column} does not exist in table {table}, skipping")
        
        logger.info("Schema update completed successfully")
        
    except Exception as e:
        logger.error(f"Error updating schema: {str(e)}")
        if 'conn' in locals() and conn and conn.is_connected():
            conn.rollback()
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    logger.info("Starting schema update to remove unwanted columns")
    remove_unwanted_columns()
    logger.info("Schema update process completed") 