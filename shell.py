#!/usr/bin/env python3
import os
import sys

try:
    import lang
except ImportError as e:
    print(f"Error importing lang module: {e}")
    sys.exit(1)

def RUN(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            text = f.read()
            
        result, error = lang.run(filename, text)

        if error:
            print(error.as_string())
            return False
        elif result:
            if len(result.elements) == 1:
                print(repr(result.elements[0]))
            else:
                print(repr(result))
            return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        RUN(sys.argv[1])