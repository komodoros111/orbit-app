# Orbit backend (API + Socket.IO + serve o SPA web). Deploy em Render/Railway/qualquer host Docker.
FROM node:20-alpine
WORKDIR /app

# Dependências do servidor (camada cacheável)
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev --no-audit --no-fund

# Código do servidor + cliente web (servido pelo próprio backend)
COPY server ./server
COPY web ./web

ENV NODE_ENV=production
# Dados persistentes — monte um disco/volume em /data no host pra manter contas/servidores
ENV ORBIT_DATA_DIR=/data
RUN mkdir -p /data

# A porta real vem da env PORT (injetada pelo host); 4317 é só o padrão local
EXPOSE 4317
CMD ["node", "server/src/index.js"]
