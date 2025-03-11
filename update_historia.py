#!/usr/bin/env python3
"""
Script to update files from Historia/ to website/

This script updates:
1. correct_answers.json
2. All files in the images/ folder
"""

import os
import shutil
import sys
from pathlib import Path

def main():
    # Get the base directory (where this script is located)
    base_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    
    # Define source and destination paths
    historia_dir = base_dir.parent / "Historia"
    website_dir = base_dir
    
    # Check if Historia directory exists
    if not historia_dir.exists():
        print(f"Error: Source directory '{historia_dir}' does not exist.")
        sys.exit(1)
    
    # 1. Update correct_answers.json
    source_json = historia_dir / "correct_answers.json"
    dest_json = website_dir / "correct_answers.json"
    
    if not source_json.exists():
        print(f"Warning: Source file '{source_json}' does not exist. Skipping.")
    else:
        print(f"Copying {source_json} to {dest_json}")
        shutil.copy2(source_json, dest_json)
    
    # 2. Update images folder
    source_images = historia_dir / "images"
    dest_images = website_dir / "images"
    
    if not source_images.exists():
        print(f"Warning: Source directory '{source_images}' does not exist. Skipping.")
    else:
        # Create destination directory if it doesn't exist
        if not dest_images.exists():
            print(f"Creating destination directory '{dest_images}'")
            dest_images.mkdir(parents=True, exist_ok=True)
        
        # Copy all files from source to destination
        for item in source_images.glob("*"):
            if item.is_file():
                dest_file = dest_images / item.name
                print(f"Copying {item} to {dest_file}")
                shutil.copy2(item, dest_file)
    
    print("Update completed successfully!")

if __name__ == "__main__":
    main()
