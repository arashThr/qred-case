PROD = docker compose -f compose.prod.yml

.PHONY: help db-up db-down db-reset prod-up prod-demo prod-logs prod-down prod-clean

help:
	@echo "Development (Postgres only; run the API with npm run dev)"
	@echo "  make db-up       start Postgres"
	@echo "  make db-down     stop Postgres"
	@echo "  make db-reset    recreate Postgres, then migrate and seed"
	@echo "Production (Postgres + migrations + API)"
	@echo "  make prod-up     build and start the whole system"
	@echo "  make prod-demo   same, with demo data"
	@echo "  make prod-logs   follow the API logs"
	@echo "  make prod-down   stop the system, keep the data"
	@echo "  make prod-clean  stop the system and delete the data"

db-up:
	docker compose up -d

db-down:
	docker compose down

db-reset:
	docker compose down -v
	docker compose up -d --wait
	npm run migrate
	npm run seed

prod-up:
	$(PROD) up -d --build

prod-demo:
	$(PROD) --profile demo up -d --build

prod-logs:
	$(PROD) logs -f api

prod-down:
	$(PROD) --profile demo down

prod-clean:
	$(PROD) --profile demo down -v
