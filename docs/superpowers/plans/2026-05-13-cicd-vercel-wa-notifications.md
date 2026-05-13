# CI/CD + Vercel + WhatsApp Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup automated CI/CD pipeline — GitHub Actions menjalankan type-check + lint, deploy ke Vercel production, lalu kirim notifikasi WhatsApp ke developer setiap ada perubahan.

**Architecture:** GitHub Actions sebagai orchestrator: validasi kode (tsc + eslint) → deploy via Vercel CLI → notifikasi WA via CallMeBot. Vercel menangani build & hosting, GitHub Actions mengontrol urutan dan kondisi deploy.

**Tech Stack:** GitHub Actions, Vercel CLI, CallMeBot WhatsApp API, Next.js 16, TypeScript

---

## ⚠️ Persiapan Wajib Sebelum Mulai

Checklist ini harus selesai **sebelum** menjalankan task apapun di bawah:

### 1. GitHub Repository
- [ ] Repo sudah ada di GitHub (public atau private)
- [ ] Branch `main` sudah ada dan berisi kode terbaru
- [ ] Kamu punya akses push ke repo tersebut

### 2. Backend Production URL
- [ ] ASP.NET backend sudah di-deploy ke server yang bisa diakses internet (bukan IP lokal `192.168.188.170`)
- [ ] URL production backend sudah diketahui (contoh: `https://api.sistro.pupuk-indonesia.com`)
- [ ] **Jika backend belum public:** pertimbangkan Cloudflare Tunnel atau Railway/Render untuk hosting backend — tanpa ini, Vercel tidak bisa reach ke backend

### 3. Vercel Account
- [ ] Daftar/login di https://vercel.com
- [ ] Simpan **Vercel Token** dari: Settings → Tokens → Create
- [ ] Simpan **Vercel Org ID** dari: Settings → General → "Your ID"

### 4. CallMeBot WA API Key
- [ ] Simpan nomor **+34 644 49 42 38** ke kontak HP dengan nama "CallMeBot"
- [ ] Kirim pesan WhatsApp ke nomor itu: `I allow callmebot to send me messages`
- [ ] Tunggu balasan berisi **apikey** (biasanya 1-2 menit)
- [ ] Simpan: nomor HP kamu (format internasional, contoh: `6281234567890`) dan apikey tersebut

### 5. Environment Variables Production
Siapkan nilai untuk semua ini sebelum setup Vercel:
```
ASPNET_API_URL=https://api.sistro.pupuk-indonesia.com    # URL backend production
NEXT_PUBLIC_ASPNET_API_URL=https://api.sistro.pupuk-indonesia.com
NEXTAUTH_URL=https://sistro-next.vercel.app               # akan update setelah tahu domain Vercel
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
```

---

## File Structure

| File | Aksi | Tanggung Jawab |
|------|------|----------------|
| `.github/workflows/ci-cd.yml` | Create | Pipeline: validate → deploy → notify |
| `vercel.json` | Create | Konfigurasi Vercel: build settings, env hints |
| `.env.example` | Modify | Tambah variabel yang belum terdokumentasi |

---

## Task 1: Buat `vercel.json`

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Buat file vercel.json**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "outputDirectory": ".next",
  "env": {
    "ASPNET_API_URL": "@aspnet_api_url",
    "NEXTAUTH_URL": "@nextauth_url",
    "NEXTAUTH_SECRET": "@nextauth_secret"
  },
  "build": {
    "env": {
      "ASPNET_API_URL": "@aspnet_api_url",
      "NEXT_PUBLIC_ASPNET_API_URL": "@next_public_aspnet_api_url",
      "NEXTAUTH_URL": "@nextauth_url",
      "NEXTAUTH_SECRET": "@nextauth_secret"
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json configuration"
```

---

## Task 2: Setup Vercel Project (Manual — Browser)

**Tidak ada file yang dibuat di task ini — semua di Vercel dashboard.**

- [ ] **Step 1: Import project ke Vercel**
  1. Buka https://vercel.com/new
  2. Pilih "Import Git Repository"
  3. Pilih repo `sistro-next` dari GitHub
  4. Framework auto-detect: Next.js ✓

- [ ] **Step 2: Set environment variables di Vercel**

Di halaman "Configure Project" sebelum deploy, isi env vars:

| Name | Value | Environment |
|------|-------|-------------|
| `ASPNET_API_URL` | `https://api.sistro...` (URL backend production) | Production |
| `NEXT_PUBLIC_ASPNET_API_URL` | sama | Production |
| `NEXTAUTH_URL` | `https://sistro-next.vercel.app` | Production |
| `NEXTAUTH_SECRET` | hasil `openssl rand -base64 32` | Production |

- [ ] **Step 3: Deploy (first time)**

Klik "Deploy". Biarkan selesai — ini deployment pertama untuk verifikasi setup benar.

- [ ] **Step 4: Catat project info**

Setelah deploy selesai, pergi ke Project Settings → General:
- Catat **Project ID** (format: `prj_xxxx`)
- Catat **Org/Team ID** (dari URL dashboard: `vercel.com/[team-name]` → Settings → General)

- [ ] **Step 5: Disable automatic deployments dari Vercel**

Karena kita akan pakai GitHub Actions sebagai trigger, matikan Vercel's own Git integration:
1. Project Settings → Git → "Connected Git Repository"
2. Klik "Disconnect" ATAU
3. Di bagian "Ignored Build Step" isi: `exit 1` (ini akan blok auto-deploy Vercel, kita yang kontrol dari GH Actions)

> **Catatan:** Opsi lain adalah tetap biarkan Vercel auto-deploy dan **hanya** pakai GitHub Actions untuk CI + WA notify saja. Lebih simple tapi kehilangan kontrol urutan. Pilihan ada di Step 5 ini — skip jika ingin tetap pakai auto-deploy Vercel.

---

## Task 3: Setup GitHub Secrets

**Tidak ada file yang dibuat — semua di GitHub Settings.**

- [ ] **Step 1: Buka GitHub Secrets**

Pergi ke repo GitHub → Settings → Secrets and variables → Actions → "New repository secret"

- [ ] **Step 2: Tambah semua secrets berikut**

| Secret Name | Value | Dari mana |
|-------------|-------|-----------|
| `VERCEL_TOKEN` | token Vercel kamu | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Org/Team ID | Vercel → Settings → General |
| `VERCEL_PROJECT_ID` | Project ID | Vercel → Project Settings → General |
| `WA_PHONE` | nomor HP kamu (contoh: `6281234567890`) | HP kamu sendiri |
| `WA_APIKEY` | apikey dari CallMeBot | Pesan WA ke CallMeBot |

- [ ] **Step 3: Verifikasi**

Pastikan semua 5 secrets muncul di daftar (nilai tidak perlu dicek, hanya nama).

---

## Task 4: Buat GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Buat direktori dan file workflow**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Buat file `.github/workflows/ci-cd.yml`**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ─────────────────────────────────────────
  # Job 1: Validasi kode (semua push + PR)
  # ─────────────────────────────────────────
  validate:
    name: Type Check & Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: ESLint
        run: npm run lint

  # ─────────────────────────────────────────
  # Job 2: Deploy ke Vercel (hanya main push)
  # ─────────────────────────────────────────
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    needs: validate
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    outputs:
      deploy_url: ${{ steps.deploy.outputs.url }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          URL=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$URL" >> $GITHUB_OUTPUT
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  # ─────────────────────────────────────────
  # Job 3: Notifikasi WhatsApp
  # ─────────────────────────────────────────
  notify:
    name: WhatsApp Notification
    runs-on: ubuntu-latest
    needs: [validate, deploy]
    if: always() && github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Send WhatsApp notification
        run: |
          VALIDATE_STATUS="${{ needs.validate.result }}"
          DEPLOY_STATUS="${{ needs.deploy.result }}"
          COMMIT_MSG=$(echo "${{ github.event.head_commit.message }}" | head -1 | cut -c1-80)
          AUTHOR="${{ github.event.head_commit.author.name }}"
          SHORT_SHA="${{ github.sha }}"
          SHORT_SHA="${SHORT_SHA:0:7}"
          DEPLOY_URL="${{ needs.deploy.outputs.deploy_url }}"
          REPO="${{ github.repository }}"
          RUN_URL="https://github.com/${REPO}/actions/runs/${{ github.run_id }}"
          WIB_TIME=$(TZ='Asia/Jakarta' date '+%Y-%m-%d %H:%M WIB')

          if [ "$DEPLOY_STATUS" = "success" ]; then
            ICON="✅"
            STATUS_TEXT="BERHASIL DEPLOY"
          elif [ "$DEPLOY_STATUS" = "skipped" ] && [ "$VALIDATE_STATUS" = "failure" ]; then
            ICON="❌"
            STATUS_TEXT="GAGAL (Type Error / Lint)"
          else
            ICON="❌"
            STATUS_TEXT="GAGAL DEPLOY"
          fi

          MESSAGE="${ICON} *SISTRO-Next ${STATUS_TEXT}*

📝 ${COMMIT_MSG}
👤 ${AUTHOR} (${SHORT_SHA})
🕐 ${WIB_TIME}
🌐 ${DEPLOY_URL:-'(tidak tersedia)'}
🔗 ${RUN_URL}"

          ENCODED=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$MESSAGE")

          curl -s "https://api.callmebot.com/whatsapp.php?phone=${{ secrets.WA_PHONE }}&text=${ENCODED}&apikey=${{ secrets.WA_APIKEY }}" || true
```

- [ ] **Step 3: Commit dan push**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "feat: add GitHub Actions CI/CD pipeline with WA notifications"
git push origin main
```

- [ ] **Step 4: Pantau di GitHub Actions**

Buka: `https://github.com/<username>/sistro-next/actions`

Pastikan workflow muncul dan berjalan. Perkiraan waktu: 3-6 menit.

---

## Task 5: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Tambahkan section CI/CD ke .env.example**

Tambahkan di bagian bawah file [.env.example](.env.example) yang sudah ada:

```bash
# ============================================================
# CI/CD & Notifications (untuk GitHub Actions Secrets — bukan .env.local)
# Variabel ini TIDAK dipakai di aplikasi, hanya di GitHub Actions
# ============================================================
# VERCEL_TOKEN=          → Vercel account token
# VERCEL_ORG_ID=         → Vercel org/team ID
# VERCEL_PROJECT_ID=     → Vercel project ID
# WA_PHONE=6281234567890 → Nomor HP (format internasional, tanpa +)
# WA_APIKEY=             → API key dari CallMeBot
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: document CI/CD secrets in .env.example"
git push origin main
```

---

## Task 6: End-to-End Test

- [ ] **Step 1: Buat commit test kecil**

Edit file apapun — misalnya tambah komentar di [next.config.ts](next.config.ts):

```typescript
// Production build via GitHub Actions + Vercel
```

```bash
git add next.config.ts
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

- [ ] **Step 2: Monitor GitHub Actions**

Buka: `https://github.com/<username>/sistro-next/actions`

Urutan jobs yang seharusnya berjalan:
1. `Type Check & Lint` → hijau ✅
2. `Deploy to Vercel` → hijau ✅
3. `WhatsApp Notification` → hijau ✅

- [ ] **Step 3: Cek WA**

Kamu seharusnya menerima WA dalam ~5 menit setelah push.

Format pesan yang akan diterima:
```
✅ SISTRO-Next BERHASIL DEPLOY

📝 test: trigger CI/CD pipeline
👤 Wahyu Febryanto (abc1234)
🕐 2026-05-13 10:30 WIB
🌐 https://sistro-next.vercel.app
🔗 https://github.com/.../actions/runs/...
```

- [ ] **Step 4: Test failure case**

Buat TypeScript error sengaja di file dummy, push, verifikasi:
- Job `validate` → merah ❌
- Job `deploy` → di-skip (tidak jalan)
- Job `notify` → kirim WA dengan pesan "GAGAL (Type Error / Lint)"

Lalu revert errornya.

- [ ] **Step 5: Revert commit test**

```bash
git revert HEAD
git push origin main
```

---

## Ringkasan Saran Persiapan

| # | Item | Kritis? | Keterangan |
|---|------|---------|------------|
| 1 | Backend production URL | 🔴 WAJIB | Tanpa ini Vercel deploy berhasil tapi app tidak bisa fetch data |
| 2 | GitHub repo public/private | 🔴 WAJIB | GitHub Actions butuh akses repo |
| 3 | Vercel account + token | 🔴 WAJIB | Untuk deploy |
| 4 | NEXTAUTH_SECRET production | 🔴 WAJIB | Jangan pakai secret dev di production |
| 5 | CallMeBot setup | 🟡 OPSIONAL | Bisa di-skip, WA notify tidak jalan tapi CI/CD tetap OK |
| 6 | Node.js 20 lokal untuk test | 🟡 OPSIONAL | Untuk debug jika pipeline gagal |

### Jika Backend Belum Public

Opsi untuk expose backend:
- **Cloudflare Tunnel** (gratis, recommended): `cloudflare tunnel --url http://192.168.188.170:8090`
- **ngrok** (gratis tier): `ngrok http 192.168.188.170:8090` — URL berubah tiap restart
- **Railway/Render**: deploy ulang backend ke cloud — solusi permanent terbaik

