docker stop bot-voter
docker rm bot-voter
docker run --restart=unless-stopped --cap-add=SYS_ADMIN -v ./data/:/app/bot_voter/data/ -it --name="bot-voter" dowdyj/botvoter-backend
