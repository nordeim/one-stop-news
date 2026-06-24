#!/usr/bin/env python3
"""
validate-compose.py — Validates all docker-compose*.yml files parse as
valid YAML with a top-level 'services' key.

Used by the CI 'Validate Shell Scripts & Docker Compose Configs' step
to catch malformed YAML before the expensive pnpm install / build steps.
"""

import glob
import sys
import yaml


def main() -> int:
    files = sorted(glob.glob("docker-compose*.yml") + glob.glob("docker-compose*.yaml"))
    if not files:
        print("  no docker-compose files found")
        return 0

    failures: list[str] = []
    for f in files:
        print(f"  validating: {f}")
        try:
            doc = yaml.safe_load(open(f))
            if not isinstance(doc, dict):
                failures.append(f"{f}: top-level YAML is not a mapping")
                continue
            if "services" not in doc:
                failures.append(f"{f}: missing top-level 'services' key")
                continue
            services = list(doc["services"].keys())
            print(f"    OK - services: {services}")
        except yaml.YAMLError as e:
            failures.append(f"{f}: YAML parse error: {e}")
        except Exception as e:
            failures.append(f"{f}: unexpected error: {e}")

    if failures:
        print()
        print("FAIL:")
        for msg in failures:
            print(f"  - {msg}")
        return 1

    print()
    print("All docker-compose files valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
