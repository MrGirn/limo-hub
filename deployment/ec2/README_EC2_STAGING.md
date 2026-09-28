# AWS EC2 Staging Deployment Guide

This guide details how to launch and operate the **Limo Executive Autonomous Platform** on a single AWS EC2 instance.

---

## 1. AWS EC2 Instance Sizing & Configuration

| Parameter | Recommended Specification |
| :--- | :--- |
| **AMI** | **Ubuntu 24.04 LTS** or **Ubuntu 22.04 LTS (x86_64)** |
| **Instance Type** | `t3.large` (2 vCPU, 8 GB RAM) or `t3.medium` (2 vCPU, 4 GB RAM) |
| **Storage (EBS)** | `40 GB gp3` SSD storage |
| **Elastic IP** | Allocate 1 Elastic IP and associate with the instance (so IP never changes) |

### Inbound Security Group Rules

| Port / Protocol | Source | Purpose |
| :--- | :--- | :--- |
| **22 (SSH)** | Your IP / Bastion | Secure SSH Terminal Access |
| **80 (HTTP)** | `0.0.0.0/0` | Web Traffic & Let's Encrypt SSL Challenges |
| **443 (HTTPS)** | `0.0.0.0/0` | Secure HTTPS Web Traffic |
| **8000 (TCP)** | `0.0.0.0/0` | Central Global Hub & Worldwide Marketplace |
| **8001 (TCP)** | `0.0.0.0/0` | ANB Philly Sovereign Cell (Driver App / Owner Console) |
| **8002 – 8006 (TCP)** | `0.0.0.0/0` | Regional Sovereign Depots (NY, Boston, Miami, London, Tokyo) |

---

## 2. Fast 1-Command Bootstrap on EC2

SSH into your newly created EC2 instance:

```bash
ssh -i /path/to/your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Clone the repository and run the automated bootstrap script:

```bash
# 1. Clone repository
sudo git clone https://github.com/MrGirn/limo-hub.git /opt/limo-platform
sudo chown -R ubuntu:ubuntu /opt/limo-platform
cd /opt/limo-platform

# 2. Run automated bootstrap (installs Docker, Compose, UFW, builds containers)
chmod +x deployment/ec2/setup_ec2.sh
./deployment/ec2/setup_ec2.sh
```

---

## 3. 1-Click Deployment from Local Machine

Whenever you make code updates locally, run this single PowerShell command:

```powershell
.\deployment\ec2\deploy_to_ec2.ps1 -Ec2Host "ubuntu@<YOUR_EC2_PUBLIC_IP>" -KeyPath "C:\path\to\your-key.pem"
```

This will automatically:
1. Compile the React frontend locally (`npm run build`).
2. Sync the updated backend `app/`, `config/`, `tests/`, and frontend `dist/` to EC2.
3. Rebuild and restart the Docker Compose containers on EC2 with zero downtime.

---

## 4. Live URL Reference on EC2

Replace `<YOUR_EC2_PUBLIC_IP>` with your instance's public IP address or domain:

| Portal | URL |
| :--- | :--- |
| **Customer VIP Storefront** | `http://<YOUR_EC2_PUBLIC_IP>:8001/` |
| **Chauffeur / Driver Mobile App** | `http://<YOUR_EC2_PUBLIC_IP>:8001/?view=driver` |
| **Vendor Owner & Dispatch Console** | `http://<YOUR_EC2_PUBLIC_IP>:8001/?view=vendor` |
| **Corporate Travel Portal** | `http://<YOUR_EC2_PUBLIC_IP>:8001/?view=corporate` |
| **Global Marketplace (Port 8000)** | `http://<YOUR_EC2_PUBLIC_IP>:8000/` |
| **Health Check API** | `http://<YOUR_EC2_PUBLIC_IP>:8001/api/v1/system-summary` |
