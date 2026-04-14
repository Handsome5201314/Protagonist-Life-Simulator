#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import posixpath
import sys
import tarfile
import tempfile
import textwrap
import time
from pathlib import Path

import paramiko


EXCLUDE_DIRS = {".git", ".next", "node_modules"}
EXCLUDE_FILES = {
    "dev-server.log",
    "dev-server.err.log",
    "tsconfig.tsbuildinfo",
    "tsconfig.codex-check.tsbuildinfo",
}
EXCLUDE_SUFFIXES = {".log", ".tsbuildinfo"}
EXCLUDE_RELATIVE_FILES = {"data/app-db.json"}


def build_release_archive(project_root: Path) -> str:
    fd, temp_path = tempfile.mkstemp(suffix=".tar.gz")
    os.close(fd)

    with tarfile.open(temp_path, "w:gz") as tar:
        for root, dirs, files in os.walk(project_root):
            dirs[:] = [directory for directory in dirs if directory not in EXCLUDE_DIRS]
            root_path = Path(root)
            for file_name in files:
                if file_name in EXCLUDE_FILES or any(file_name.endswith(suffix) for suffix in EXCLUDE_SUFFIXES):
                    continue
                full_path = root_path / file_name
                rel_path = full_path.relative_to(project_root)
                if str(rel_path).replace("\\", "/") in EXCLUDE_RELATIVE_FILES:
                    continue
                tar.add(full_path, arcname=str(rel_path).replace("\\", "/"))

    return temp_path


def run_remote_command(client: paramiko.SSHClient, command: str, timeout: int = 600) -> tuple[str, str, int]:
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", "ignore")
    err = stderr.read().decode("utf-8", "ignore")
    code = stdout.channel.recv_exit_status()
    return out, err, code


def upload_release(
    *,
    host: str,
    username: str,
    password: str,
    project_root: Path,
    base_dir: str,
    app_name: str,
    app_port: int,
    public_port: int,
    server_name: str,
    bootstrap_nginx: bool,
) -> None:
    release_id = time.strftime("%Y%m%d-%H%M%S")
    artifact_local = build_release_archive(project_root)
    artifact_remote = posixpath.join(base_dir, "artifacts", f"release-{release_id}.tar.gz")
    release_remote = posixpath.join(base_dir, "releases", release_id)
    current_remote = posixpath.join(base_dir, "current")
    deploy_script_remote = posixpath.join(base_dir, "deploy-current.sh")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=username,
        password=password,
        timeout=15,
        banner_timeout=15,
        auth_timeout=15,
    )

    try:
        prep_command = f"mkdir -p {posixpath.join(base_dir, 'artifacts')} {posixpath.join(base_dir, 'releases')}"
        out, err, code = run_remote_command(client, prep_command, timeout=60)
        if code != 0:
            raise RuntimeError(err or out or "Failed to prepare remote directories")

        sftp = client.open_sftp()
        try:
            sftp.put(artifact_local, artifact_remote)
        finally:
            sftp.close()

        nginx_block = ""
        if bootstrap_nginx:
            nginx_block = textwrap.dedent(
                f"""
                export DEBIAN_FRONTEND=noninteractive
                echo "{password}" | sudo -S -p "" apt-get update
                echo "{password}" | sudo -S -p "" apt-get install -y nginx
                if [ ! -f /etc/nginx/sites-available/{app_name} ]; then
                  cat <<'NGINX' | sudo tee /etc/nginx/sites-available/{app_name} >/dev/null
                  server {{
                      listen {public_port};
                      server_name {server_name};

                      location / {{
                          proxy_pass http://127.0.0.1:{app_port};
                          proxy_http_version 1.1;
                          proxy_set_header Host $host;
                          proxy_set_header X-Real-IP $remote_addr;
                          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                          proxy_set_header X-Forwarded-Proto $scheme;
                          proxy_set_header Upgrade $http_upgrade;
                          proxy_set_header Connection "upgrade";
                          proxy_cache_bypass $http_upgrade;
                      }}
                  }}
NGINX
                fi
                echo "{password}" | sudo -S -p "" ln -sfn /etc/nginx/sites-available/{app_name} /etc/nginx/sites-enabled/{app_name}
                echo "{password}" | sudo -S -p "" rm -f /etc/nginx/sites-enabled/default
                echo "{password}" | sudo -S -p "" nginx -t
                echo "{password}" | sudo -S -p "" systemctl enable nginx
                echo "{password}" | sudo -S -p "" systemctl restart nginx
                """
            ).strip()

        systemd_unit = textwrap.dedent(
            f"""
            [Unit]
            Description={app_name} Next.js App
            After=network.target

            [Service]
            Type=simple
            User={username}
            WorkingDirectory={current_remote}
            Environment=NODE_ENV=production
            ExecStart=/usr/bin/npm start -- --hostname 0.0.0.0 --port {app_port}
            Restart=always
            RestartSec=5

            [Install]
            WantedBy=multi-user.target
            """
        ).strip()

        deploy_script = (
            "#!/usr/bin/env bash\n"
            "set -e\n\n"
            f'mkdir -p "{release_remote}"\n'
            f'tar -xzf "{artifact_remote}" -C "{release_remote}"\n'
            f'mkdir -p "{posixpath.join(base_dir, "shared", "data")}"\n'
            f'if [ ! -f "{posixpath.join(base_dir, "shared", "data", "app-db.json")}" ]; then\n'
            f'  if [ -f "{posixpath.join(current_remote, "data", "app-db.json")}" ]; then cp "{posixpath.join(current_remote, "data", "app-db.json")}" "{posixpath.join(base_dir, "shared", "data", "app-db.json")}";\n'
            f'  elif [ -f "{posixpath.join(release_remote, "data", "app-db.json")}" ]; then cp "{posixpath.join(release_remote, "data", "app-db.json")}" "{posixpath.join(base_dir, "shared", "data", "app-db.json")}"; fi\n'
            "fi\n"
            f'rm -rf "{posixpath.join(release_remote, "data")}"\n'
            f'ln -sfn "{posixpath.join(base_dir, "shared", "data")}" "{posixpath.join(release_remote, "data")}"\n'
            f'cd "{release_remote}"\n'
            "npm ci --no-audit --no-fund\n"
            "npm run build\n\n"
            f'ln -sfn "{release_remote}" "{current_remote}"\n\n'
            f"cat <<'SERVICE' | sudo tee /etc/systemd/system/{app_name}.service >/dev/null\n"
            f"{systemd_unit}\n"
            "SERVICE\n"
            f'echo "{password}" | sudo -S -p "" systemctl daemon-reload\n'
            f'echo "{password}" | sudo -S -p "" systemctl enable {app_name}.service\n'
            f'echo "{password}" | sudo -S -p "" systemctl restart {app_name}.service\n\n'
            "sleep 3\n"
            f"curl -I --max-time 20 http://127.0.0.1:{app_port}\n\n"
            f"{nginx_block}\n"
        )

        temp_remote_script = tempfile.NamedTemporaryFile(delete=False, suffix=".sh")
        temp_remote_script.write(deploy_script.encode("utf-8"))
        temp_remote_script.close()

        sftp = client.open_sftp()
        try:
            sftp.put(temp_remote_script.name, deploy_script_remote)
            sftp.chmod(deploy_script_remote, 0o755)
        finally:
            sftp.close()
            os.unlink(temp_remote_script.name)

        out, err, code = run_remote_command(client, f"bash {deploy_script_remote}", timeout=1800)
        if code != 0:
            raise RuntimeError((out + "\n" + err).strip())

        sys.stdout.buffer.write((out.strip() + "\n").encode("utf-8", "ignore"))
        sys.stdout.buffer.write((f"Release deployed: {release_remote}\n").encode("utf-8", "ignore"))
        if bootstrap_nginx:
            sys.stdout.buffer.write((f"Public URL: http://{server_name if server_name != '_' else host}\n").encode("utf-8", "ignore"))
        else:
            sys.stdout.buffer.write((f"Application URL: http://{host}:{app_port}\n").encode("utf-8", "ignore"))
    finally:
        client.close()
        os.unlink(artifact_local)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy the Next.js app to a remote Ubuntu server over SSH.")
    parser.add_argument("--host", required=True, help="Remote server host or IP.")
    parser.add_argument("--username", required=True, help="SSH username.")
    parser.add_argument("--password", required=True, help="SSH password.")
    parser.add_argument("--server-name", default="xiaozhiserver.cloud", help="Nginx server_name value. Use IP or domain.")
    parser.add_argument("--base-dir", default="/home/ubuntu/apps/turing-destiny-arena", help="Remote base directory.")
    parser.add_argument("--app-name", default="turing-destiny-arena", help="PM2 and nginx site name.")
    parser.add_argument("--app-port", type=int, default=3001, help="Internal app port.")
    parser.add_argument("--public-port", type=int, default=80, help="Public nginx port.")
    parser.add_argument(
        "--skip-nginx",
        action="store_true",
        help="Only deploy the app service; do not install or configure nginx.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_root = Path(__file__).resolve().parent.parent
    upload_release(
      host=args.host,
      username=args.username,
      password=args.password,
      project_root=project_root,
      base_dir=args.base_dir,
      app_name=args.app_name,
      app_port=args.app_port,
      public_port=args.public_port,
      server_name=args.server_name,
      bootstrap_nginx=not args.skip_nginx,
    )


if __name__ == "__main__":
    main()
