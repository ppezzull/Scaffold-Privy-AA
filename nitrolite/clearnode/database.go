package main

import (
	"fmt"
	"log"
	"net/url"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/pressly/goose/v3"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

// In order to connect to Postgresql you need to fill out all the fields.
//
// To connect to sqlite, you just need to specify "sqlite" driver.
// By default it will use in-memory database. You can provide CLEARNODE_DATABASE_NAME to use the file.
type DatabaseConfig struct {
	URL      string `env:"CLEARNODE_DATABASE_URL" env-default:""`
	Name     string `env:"CLEARNODE_DATABASE_NAME" env-default:""`
	Schema   string `env:"CLEARNODE_DATABASE_SCHEMA" env-default:""`
	Driver   string `env:"CLEARNODE_DATABASE_DRIVER" env-default:"postgres"`
	Username string `env:"CLEARNODE_DATABASE_USERNAME"  env-default:"postgres"`
	Password string `env:"CLEARNODE_DATABASE_PASSWORD" env-default:"your-super-secret-and-long-postgres-password"`
	Host     string `env:"CLEARNODE_DATABASE_HOST" env-default:"localhost"`
	Port     string `env:"CLEARNODE_DATABASE_PORT" env-default:"5432"`
	Retries  int    `env:"CLEARNODE_DATABASE_RETRIES" env-default:"5"`
}

// ParseConnectionString parses a PostgreSQL URI and returns a DatabaseConfig
func ParseConnectionString(connStr string) (DatabaseConfig, error) {
	log.Println("parsing db connection string")
	// SQLite detection: starts with "file:"
	if strings.HasPrefix(connStr, "file:") {
		// Separate path from query
		parts := strings.SplitN(connStr[5:], "?", 2)
		dbName := parts[0]
		return DatabaseConfig{
			Name:    dbName,
			Driver:  "sqlite",
			Host:    "",
			Port:    "",
			Retries: 1,
		}, nil
	}

	// Postgresql parsing
	parsedURL, err := url.Parse(connStr)
	if err != nil {
		return DatabaseConfig{}, fmt.Errorf("invalid connection string: %w", err)
	}

	if parsedURL.Scheme != "postgres" && parsedURL.Scheme != "postgresql" {
		return DatabaseConfig{}, fmt.Errorf("unsupported scheme: %s", parsedURL.Scheme)
	}

	user := parsedURL.User
	username := ""
	password := ""
	if user != nil {
		username = user.Username()
		password, _ = user.Password()
	}

	host := parsedURL.Hostname()
	port := parsedURL.Port()
	if port == "" {
		port = "5432" // default PostgreSQL port
	}

	dbName := strings.TrimPrefix(parsedURL.Path, "/")

	// extract schema if present in query parameters
	schema := ""
	retries := 5

	query := parsedURL.Query()
	if s := query.Get("search_path"); s != "" {
		schema = s
	}
	if r := query.Get("retries"); r != "" {
		if retryVal, err := strconv.Atoi(r); err == nil {
			retries = retryVal
		}
	}

	return DatabaseConfig{
		Name:     dbName,
		Schema:   schema,
		Driver:   "postgres",
		Username: username,
		Password: password,
		Host:     host,
		Port:     port,
		Retries:  retries,
	}, nil
}

func ConnectToDB(cnf DatabaseConfig) (*gorm.DB, error) {
	switch cnf.Driver {
	case "postgres":
		return connectToPostgresql(cnf)
	case "sqlite", "":
		return connectToSqlite(cnf)
	default:
		return nil, fmt.Errorf("unsupported driver: %s", cnf.Driver)
	}
}

func connectToPostgresql(cnf DatabaseConfig) (*gorm.DB, error) {
	log.Println("connecting to Postgresql")
	// Create schema if not exists
	ensurePostgresqlSchema(cnf)

	// Apply migrations
	migratePostgres(cnf)

	// Connect to db
	dsn, err := postgresqlDbUrl(cnf)
	if err != nil {
		return nil, err
	}
	dial := postgres.Open(dsn)

	db, err := gorm.Open(dial, &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			TablePrefix: cnf.Schema + ".", // schema name
		}})
	if err != nil {
		return nil, err
	}

	return db, nil
}

func connectToSqlite(cnf DatabaseConfig) (*gorm.DB, error) {
	var dsn string
	if cnf.Name != "" {
		log.Println("connecting to sqlite")
		dsn = fmt.Sprintf("file:%s?cache=shared", cnf.Name)
	} else {
		log.Println("connecting to in-memory sqlite")
		dsn = "file::memory:?cache=shared"
	}
	dial := sqlite.Open(dsn)

	db, err := gorm.Open(dial, &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			TablePrefix: cnf.Schema + ".", // schema name
		}})
	if err != nil {
		return nil, err
	}

	// Migrate sqlite
	migrateSqlite(db)

	log.Println("Successfully auto-migrated")

	return db, nil
}

func postgresqlDbUrl(cnf DatabaseConfig) (string, error) {
	switch cnf.Driver {
	case "postgres":
		dsn := fmt.Sprintf(
			"user=%s password=%s host=%s port=%s dbname=%s sslmode=disable",
			cnf.Username, cnf.Password, cnf.Host, cnf.Port, cnf.Name,
		)

		if cnf.Schema != "" {
			dsn = fmt.Sprintf("%s search_path=%s", dsn, cnf.Schema)
		}

		return dsn, nil

	default:
		return "", fmt.Errorf("unsupported driver: %s", cnf.Driver)
	}
}

func ensurePostgresqlSchema(cnf DatabaseConfig) error {
	log.Println("creating schema")
	dbConf := cnf
	dbConf.Schema = ""
	dsn, err := postgresqlDbUrl(dbConf)
	if err != nil {
		return err
	}

	db, err := sqlx.Connect(dbConf.Driver, dsn)
	if err != nil {
		return err
	}

	queryDbCheck := fmt.Sprintf("SELECT 1 FROM information_schema.schemata WHERE schema_name='%s'", cnf.Schema)
	if res, err := db.Exec(queryDbCheck); err != nil {
		return fmt.Errorf("error while checking schema existance: %s", err.Error())
	} else if rows, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("error while checking schema existance: %s", err.Error())
	} else if rows > 0 {
		log.Printf("Schema already exists: %s\n", cnf.Schema)
		return nil
	}

	if _, err = db.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", cnf.Schema)); err != nil {
		return fmt.Errorf("error while creating schema: %s", err.Error())
	}

	log.Printf("Schema created: %s\n", cnf.Schema)
	return nil
}

func migratePostgres(cnf DatabaseConfig) error {
	dsn, err := postgresqlDbUrl(cnf)
	if err != nil {
		return err
	}

	db, err := goose.OpenDBWithDriver(cnf.Driver, dsn)
	if err != nil {
		return err
	}

	if cnf.Schema != "" {
		switch cnf.Driver {
		case "postgres":
			if _, err := db.Exec(fmt.Sprintf("SET search_path TO %s", cnf.Schema)); err != nil {
				return fmt.Errorf("failed to set search path: %v", err)
			}
		}
	}

	log.Println("Applying database migrations")
	goose.SetBaseFS(embedMigrations)
	if err := goose.Up(db, "config/migrations/"+cnf.Driver); err != nil {
		panic(err)
	}

	log.Println("Applied migrations")
	return nil
}

func migrateSqlite(db *gorm.DB) error {
	if err := db.AutoMigrate(&Entry{}, &Channel{}, &Asset{}, &AppSession{}, &RPCRecord{}, &SignerWallet{}); err != nil {
		return err
	}
	return nil
}
