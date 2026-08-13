"""
Delinquency analysis by age and sex.
Reads raw schema to find customer demographics, merges with lease_features_v2.
"""
import os
from datetime import datetime

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text, inspect

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql:///arranca_moros")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def explore_schema():
    """Find tables and columns related to customer demographics."""
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)

    print("\n=== SCHEMA EXPLORATION ===\n")

    # List all schemas
    schemas = inspector.get_schema_names()
    print(f"Schemas: {schemas}\n")

    # Look for customer/people tables in raw schema
    for schema in ["raw", "public"]:
        if schema not in schemas:
            continue

        tables = inspector.get_table_names(schema=schema)
        print(f"\n{schema} schema tables:")
        for table in sorted(tables):
            cols = inspector.get_columns(table, schema=schema)
            col_names = [c['name'] for c in cols]
            print(f"  {table}: {col_names[:10]}...")  # First 10 cols

            # Look for demographics-related columns
            if any(x in ' '.join(col_names).lower() for x in ['birth', 'dob', 'fecha', 'sexo', 'gender', 'customer', 'person']):
                print(f"    ^ Contains demographics fields")


def main():
    engine = create_engine(DATABASE_URL)

    # First, explore to find the right table
    explore_schema()

    # Try to find customer birth date and sex
    print("\n\n=== SEARCHING FOR DEMOGRAPHICS DATA ===\n")

    # Common patterns
    try:
        with engine.connect() as conn:
            # Look for customers table with birth info
            result = conn.execute(text("""
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE column_name ILIKE ANY(ARRAY['%birth%', '%dob%', '%fecha%nac%', '%sexo%', '%gender%'])
                ORDER BY table_name, ordinal_position
            """))

            found_cols = result.fetchall()
            if found_cols:
                print("Found demographic columns:")
                for table, col in found_cols:
                    print(f"  {table}.{col}")
            else:
                print("No obvious demographic columns found.")
                print("Checking raw schema tables for structure...")

                # List all tables in raw schema
                result = conn.execute(text("""
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'raw'
                    LIMIT 20
                """))
                tables = [row[0] for row in result.fetchall()]
                print(f"\nRaw schema tables: {tables}")

    except Exception as e:
        print(f"Error exploring schema: {e}")


if __name__ == "__main__":
    main()
