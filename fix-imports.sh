#!/bin/bash

# Fix React imports in component files
find src/components -name "*.jsx" -type f -exec grep -l "import React" {} \; | while read file; do
    echo "Fixing $file"
    # Remove standalone React imports
    sed -i '' '/^import React from/d' "$file"
    # Remove React from mixed imports  
    sed -i '' 's/import React, { /import { /g' "$file"
    sed -i '' 's/import React, {/import {/g' "$file"
done

echo "React import cleanup complete"
