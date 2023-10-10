SHELL := /bin/sh

all:
	@echo "\e[39;49;1mCompiling typescript files...\e[0m"
	@npx tsc

init:
	@if [ $$(id -u) -eq 0 ]; then \
		echo "Please run as a standard user."; \
		exit 1; \
	fi

	@if [ -z "$$(command -v xvfb-run)" ]; then \
		echo "Please install xvfb on your machine before running this script."; \
		exit 1; \
	fi

	@if [ -z "$$(command -v jq)" ]; then \
		echo "Please install jq on your machine before running this script."; \
		exit 1; \
	fi

	@echo "\e[39;49;1mInstalling node package prerequisites...\e[0m"
	@npm i
	@echo "\e[39;49;1mCompiling typescript files...\e[0m"
	@npx tsc
	@if [ -z $$(which chromium) ]; then \
		echo "\e[39;49;1mInstalling chromium...\e[0m"; \
		node installPuppeteerChromium.js; \
	else \
		echo "Skipping Chromium download. Chromium found at $$(which chromium-browser)"; \
	fi
	@echo "\e[34;1m[Setup complete]\e[0m\e[39;49m To run, edit\e[39;49;1m \"config.json\",\e[0m then run\e[39;49;1m \"./run.sh\"."
	
clean:
	-rm -f *.js
	-rm -f Handler/*.js
	-rm -f Enum/*.js