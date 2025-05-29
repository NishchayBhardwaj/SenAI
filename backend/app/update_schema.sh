#!/bin/bash

echo "Running schema update to remove unwanted columns..."
python update_schema.py
echo "Done!" 