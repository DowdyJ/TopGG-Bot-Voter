FROM node:18

WORKDIR /app/bot_voter/source
COPY source/package*.json ./
RUN npm install

RUN apt-get update && apt-get install \
    build-essential \
    curl \
    jq \
    xvfb \
    xauth \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-khmeros \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libglib2.0-0 \
    libnss3 \
    libgtk-3-0 \
    libasound2 \
    libgbm1 \
    libwayland-server0 \
    --no-install-recommends -y

RUN apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app/bot_voter/
COPY . .
WORKDIR /app/bot_voter/source
RUN make
WORKDIR /app/bot_voter/
CMD ["./run.sh"]
