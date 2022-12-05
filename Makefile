SHELL := /bin/sh
all:
	@echo "\e[39;49;1mCompiling typescript files...\e[0m"
	@npx tsc

init:
	@ID=$(id -u)
	@if [ "${ID}" = "0" ] && { [ $(command -v xvfb-run) = "" ] || [ $(command -v jq) = "" ]; } \
	then \
		@echo Please run as root OR install jq and xvfb on your machine before running this script.;\
		@exit;\
	fi

	@if [ "${ID}" = "0" ] && { [ $(command -v jq) = "" ]; } \
	then \
		@sudo apt install jq;\
	fi
	
	@if [ "${ID}" = "0" ] && { [ $(command -v xvfb-run) = "" ]; } \
	then \
		@sudo apt install xvfb;\
	fi
	@echo "\e[39;49;1mInstalling node package prerequisites...\e[0m"
	@npm i
	@echo "\e[39;49;1mCompiling typescript files...\e[0m"
	@npx tsc
	@echo "\e[39;49;1mInstalling chromium...\e[0m"
	@node installPuppeteerChromium.js
	@echo "\e[34;1m[Setup complete]\e[0m\e[39;49m To run, edit\e[39;49;1m \"UserInfo.txt\",\e[0m then run\e[39;49;1m \"./run.sh\"."
	
clean:
	-rm -f *.js