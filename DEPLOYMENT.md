# Руководство по развертыванию на Digital Ocean

Это руководство поможет вам развернуть DevLinks Backend на VPS от Digital Ocean с настройкой CI/CD через GitHub Actions.

## Содержание

1. [Требования](#требования)
2. [Создание Droplet на Digital Ocean](#создание-droplet-на-digital-ocean)
3. [Настройка VPS](#настройка-vps)
4. [Установка необходимого ПО](#установка-необходимого-по)
5. [Настройка проекта на сервере](#настройка-проекта-на-сервере)
6. [Настройка Nginx и SSL](#настройка-nginx-и-ssl)
7. [Настройка GitHub Actions](#настройка-github-actions)
8. [Первый деплой](#первый-деплой)
9. [Мониторинг и обслуживание](#мониторинг-и-обслуживание)

---

## Требования

- Аккаунт на [Digital Ocean](https://www.digitalocean.com/)
- Репозиторий на GitHub
- Домен (опционально, но рекомендуется)
- Базовые знания Linux и командной строки

---

## Создание Droplet на Digital Ocean

1. **Войдите в Digital Ocean** и перейдите в раздел Droplets
2. **Создайте новый Droplet:**
   - **Image:** Ubuntu 22.04 LTS x64
   - **Plan:**
     - Минимум: Basic - 2 GB RAM / 1 vCPU / 50 GB SSD ($12/месяц)
     - Рекомендуется: Basic - 4 GB RAM / 2 vCPU / 80 GB SSD ($24/месяц)
   - **Datacenter:** Выберите ближайший к вашим пользователям
   - **Authentication:** SSH Key (создайте новый ключ или используйте существующий)
   - **Hostname:** devlinks-backend

3. **Сохраните IP-адрес** вашего Droplet

---

## Настройка VPS

### 1. Подключитесь к серверу

```bash
ssh root@YOUR_SERVER_IP
```

### 2. Обновите систему

```bash
apt update && apt upgrade -y
```

### 3. Создайте нового пользователя (опционально, но рекомендуется)

```bash
adduser deploy
usermod -aG sudo deploy
```

Скопируйте SSH ключи для нового пользователя:

```bash
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Переключитесь на нового пользователя:

```bash
su - deploy
```

### 4. Настройте firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Установка необходимого ПО

### 1. Установите Docker

```bash
# Установите необходимые пакеты
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Добавьте официальный GPG ключ Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавьте репозиторий Docker
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установите Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Добавьте пользователя в группу docker
sudo usermod -aG docker ${USER}

# Перезайдите для применения изменений
exit
# затем снова подключитесь
```

### 2. Установите Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверьте установку
docker --version
docker-compose --version
```

### 3. Установите Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4. Установите Certbot (для SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5. Установите Git

```bash
sudo apt install -y git
```

---

## Настройка проекта на сервере

### 1. Создайте директорию для проекта

```bash
sudo mkdir -p /opt/devlinks-backend
sudo chown -R $USER:$USER /opt/devlinks-backend
cd /opt/devlinks-backend
```

### 2. Клонируйте репозиторий

```bash
# Для приватного репозитория настройте SSH ключ
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Добавьте ключ в GitHub (Settings > SSH and GPG keys)

# Клонируйте репозиторий
git clone git@github.com:YOUR_USERNAME/devlinks-backend.git .
```

### 3. Создайте .env файл

```bash
nano .env
```

Скопируйте содержимое из `.env.example` и заполните переменные:

```env
# Database
POSTGRES_USER=devlinks
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=devlinks
DATABASE_URL=postgresql://devlinks:your_secure_password_here@postgres:5432/devlinks

# Server
PORT=8000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Secrets (сгенерируйте случайные строки)
ACCESS_SECRET=your_access_secret_here_min_32_chars
REFRESH_SECRET=your_refresh_secret_here_min_32_chars
RESET_SECRET=your_reset_secret_here_min_32_chars

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Cloudflare R2 / S3
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_PUBLIC_URL=https://your-bucket.r2.dev
R2_BUCKET_NAME=your_bucket_name

# Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
```

**Для генерации секретов используйте:**

```bash
openssl rand -base64 32
```

### 4. Сделайте deploy.sh исполняемым

```bash
chmod +x deploy.sh
```

### 5. Первый запуск

```bash
docker-compose up -d
```

Проверьте логи:

```bash
docker-compose logs -f
```

### 6. Выполните миграции базы данных

```bash
docker-compose exec app bun run migrate
```

---

## Настройка Nginx и SSL

### 1. Создайте конфигурацию Nginx

```bash
sudo nano /etc/nginx/sites-available/devlinks-backend
```

Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # Замените на ваш домен

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Ограничение размера загружаемых файлов
    client_max_body_size 10M;
}
```

### 2. Активируйте конфигурацию

```bash
sudo ln -s /etc/nginx/sites-available/devlinks-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Настройте SSL с Let's Encrypt

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot автоматически настроит SSL и создаст редирект с HTTP на HTTPS.

### 4. Настройте автообновление сертификата

```bash
sudo certbot renew --dry-run
```

---

## Настройка GitHub Actions

### 1. Добавьте GitHub Secrets

Перейдите в ваш репозиторий на GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

Добавьте следующие секреты:

- `VPS_HOST`: IP-адрес вашего сервера
- `VPS_USERNAME`: имя пользователя (например, `deploy` или `root`)
- `VPS_SSH_KEY`: приватный SSH ключ (содержимое `~/.ssh/id_rsa`)

Чтобы получить приватный ключ на вашем **локальном компьютере**:

```bash
cat ~/.ssh/id_rsa
```

Или создайте специальный ключ для GitHub Actions на **сервере**:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions  # Скопируйте это в VPS_SSH_KEY
```

### 2. Workflow уже создан

Файл `.github/workflows/deploy.yml` уже создан и настроен. Он будет автоматически деплоить при каждом push в ветку `main`.

---

## Первый деплой

### 1. Коммит и push изменений

```bash
git add .
git commit -m "Add Docker configuration and CI/CD"
git push origin main
```

### 2. Проверьте GitHub Actions

Перейдите на GitHub: **Actions** → выберите ваш workflow

### 3. Проверьте статус на сервере

```bash
ssh YOUR_USERNAME@YOUR_SERVER_IP
cd /opt/devlinks-backend
docker-compose ps
docker-compose logs -f app
```

---

## Мониторинг и обслуживание

### Полезные команды

**Просмотр логов:**
```bash
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

**Перезапуск сервисов:**
```bash
docker-compose restart app
```

**Проверка использования ресурсов:**
```bash
docker stats
```

**Обновление проекта вручную:**
```bash
cd /opt/devlinks-backend
./deploy.sh
```

### Бэкапы базы данных

**Создание бэкапа:**
```bash
docker-compose exec postgres pg_dump -U devlinks devlinks > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Восстановление из бэкапа:**
```bash
cat backup.sql | docker-compose exec -T postgres psql -U devlinks devlinks
```

### Автоматические бэкапы

Создайте cron задачу:

```bash
crontab -e
```

Добавьте (ежедневный бэкап в 3 часа ночи):

```bash
0 3 * * * cd /opt/devlinks-backend && docker-compose exec -T postgres pg_dump -U devlinks devlinks > /backup/db_$(date +\%Y\%m\%d).sql
```

### Мониторинг диска

```bash
df -h
docker system df
```

**Очистка неиспользуемых Docker ресурсов:**
```bash
docker system prune -a --volumes
```

---

## Решение проблем

### Приложение не запускается

```bash
# Проверьте логи
docker-compose logs app

# Проверьте переменные окружения
docker-compose exec app env | grep DATABASE_URL

# Перезапустите с пересборкой
docker-compose down
docker-compose up -d --build
```

### Проблемы с подключением к базе данных

```bash
# Проверьте работу PostgreSQL
docker-compose exec postgres pg_isready -U devlinks

# Подключитесь к базе данных
docker-compose exec postgres psql -U devlinks devlinks
```

### Проблемы с Redis

```bash
# Проверьте Redis
docker-compose exec redis redis-cli ping
# Должен вернуть: PONG
```

### GitHub Actions не может подключиться

1. Проверьте SSH ключ в GitHub Secrets
2. Убедитесь, что порт 22 открыт в firewall
3. Проверьте права на `.ssh/authorized_keys` на сервере:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

## Дополнительные улучшения

### 1. Настройка fail2ban (защита от брутфорса)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Установка Portainer (веб-интерфейс для Docker)

```bash
docker volume create portainer_data
docker run -d -p 9000:9000 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

Доступ: `http://YOUR_SERVER_IP:9000`

### 3. Настройка мониторинга (Prometheus + Grafana)

Можно настроить мониторинг метрик приложения, но это выходит за рамки базового деплоя.

---

## Полезные ссылки

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Digital Ocean Community Tutorials](https://www.digitalocean.com/community/tutorials)

---

## Контрольный список перед запуском в production

- [ ] Все переменные окружения настроены в `.env`
- [ ] Секреты сгенерированы с помощью `openssl rand -base64 32`
- [ ] Firewall настроен (UFW)
- [ ] SSL сертификат установлен
- [ ] Автообновление SSL настроено
- [ ] Бэкапы базы данных настроены
- [ ] GitHub Secrets добавлены
- [ ] SSH доступ по ключам настроен
- [ ] Root login отключен (опционально)
- [ ] Мониторинг логов настроен
- [ ] Тестовый деплой выполнен успешно

---

Если у вас возникли вопросы или проблемы, проверьте раздел "Решение проблем" или откройте issue в репозитории.
