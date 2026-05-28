import os

def compile_project_to_txt(root_dir, output_filename="project_compilation.txt"):
    """
    Compiles relevant source files for an Electron-Vite project,
    ignoring build artifacts and binary data.
    """
    
    # 1. File extensions to INCLUDE
    INCLUDE_EXTENSIONS = {
        '.js', '.jsx', '.ts', '.tsx', 
        '.css', '.scss', '.sass', 
        '.html', 
        '.json', 
        '.md', 
        '.yaml', '.yml'  # Added for .prettierrc.yaml, electron-builder.yml
    }

    # 2. Directories to IGNORE completely
    IGNORE_DIRS = { 
        'node_modules', 'dist', 'build', 'out',  # Added 'out' for Electron builds
        '.git', '.next', 'coverage', '.cache'
    }
    
    # 3. Specific files to IGNORE
    IGNORE_FILES = {
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
        '.DS_Store', 'Thumbs.db',
        # Database files (Binary)
        'database.sqlite', 'database.sqlite-shm', 'database.sqlite-wal',
        # The script itself and its own output
        os.path.basename(__file__), output_filename
    }

    print(f"Scanning: {root_dir}")
    print(f"Ignoring folders: {IGNORE_DIRS}")

    with open(output_filename, 'w', encoding='utf-8') as outfile:
        
        for dirpath, dirnames, filenames in os.walk(root_dir):
            
            # Filter ignored directories so we don't walk into them
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

            for filename in filenames:
                if filename in IGNORE_FILES:
                    continue

                file_path = os.path.join(dirpath, filename)
                _, ext = os.path.splitext(filename)
                
                print(file_path)
                
                # Handle edge cases for extensions
                clean_ext = ext.lower()
                if filename.lower().endswith('.env.example'):
                    clean_ext = '.env.example'
                
                # Check extension
                if clean_ext in INCLUDE_EXTENSIONS:
                    
                    # Calculate relative path (removes the long C:/Users/... prefix)
                    rel_path = os.path.relpath(file_path, root_dir)

                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                            content = infile.read()
                        
                        # Write formatted header and content
                        outfile.write(f"{'='*60}\n")
                        outfile.write(f"FILE: {rel_path}\n")
                        outfile.write(f"{'='*60}\n\n")
                        outfile.write(content)
                        outfile.write("\n\n")

                    except Exception as e:
                        outfile.write(f"ERROR reading {rel_path}: {e}\n\n")

    print(f"Done! Output saved to {output_filename}")

if __name__ == "__main__":
    project_root = os.getcwd()
    compile_project_to_txt(project_root)