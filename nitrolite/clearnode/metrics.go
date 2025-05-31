package main

import (
	"context"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"gorm.io/gorm"
)

// Metrics contains all Prometheus metrics for the application
type Metrics struct {
	// WebSocket connection metrics
	ConnectedClients prometheus.Gauge
	ConnectionsTotal prometheus.Counter
	MessageReceived  prometheus.Counter
	MessageSent      prometheus.Counter

	// Authentication metrics
	AuthRequests       prometheus.Counter
	AuthAttemptsTotal  *prometheus.CounterVec
	AuthAttempsSuccess *prometheus.CounterVec
	AuthAttempsFail    *prometheus.CounterVec

	// Channel metrics
	ChannelsTotal  prometheus.Gauge
	ChannelsOpen   prometheus.Gauge
	ChannelsClosed prometheus.Gauge

	// RPC method metrics
	RPCRequests *prometheus.CounterVec

	// Application metrics
	AppSessionsTotal prometheus.Gauge

	// Smart contract metrics
	BrokerBalanceAvailable *prometheus.GaugeVec
	BrokerChannelCount     *prometheus.GaugeVec

	// Broker wallet metrics
	BrokerWalletBalance *prometheus.GaugeVec
}

// NewMetrics initializes and registers Prometheus metrics
func NewMetrics() *Metrics {
	metrics := &Metrics{
		ConnectedClients: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "clearnet_connected_clients",
			Help: "The current number of connected clients",
		}),
		ConnectionsTotal: promauto.NewCounter(prometheus.CounterOpts{
			Name: "clearnet_connections_total",
			Help: "The total number of WebSocket connections made since server start",
		}),
		MessageReceived: promauto.NewCounter(prometheus.CounterOpts{
			Name: "clearnet_ws_messages_received_total",
			Help: "The total number of WebSocket messages received",
		}),
		MessageSent: promauto.NewCounter(prometheus.CounterOpts{
			Name: "clearnet_ws_messages_sent_total",
			Help: "The total number of WebSocket messages sent",
		}),
		AuthRequests: promauto.NewCounter(prometheus.CounterOpts{
			Name: "clearnet_auth_requests_total",
			Help: "The total number of auth_requests (get challenge code)",
		}),
		AuthAttemptsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "clearnet_auth_attempts_total",
				Help: "The total number of authentication attempts",
			},
			[]string{"auth_method"},
		),
		AuthAttempsSuccess: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "clearnet_auth_attempts_success",
				Help: "The total number of successfull authentication attempts",
			},
			[]string{"auth_method"},
		),
		AuthAttempsFail: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "clearnet_auth_attempts_fail",
				Help: "The total number of failed authentication attempts",
			},
			[]string{"auth_method"},
		),
		ChannelsTotal: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "clearnet_channels_total",
			Help: "The total number of channels",
		}),
		ChannelsOpen: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "clearnet_channels_open",
			Help: "The number of open channels",
		}),
		ChannelsClosed: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "clearnet_channels_closed",
			Help: "The number of closed channels",
		}),
		RPCRequests: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "clearnet_rpc_requests_total",
				Help: "The total number of RPC requests by method",
			},
			[]string{"method"},
		),
		AppSessionsTotal: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "clearnet_app_sessions_total",
			Help: "The total number of application sessions",
		}),
		BrokerBalanceAvailable: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "clearnet_broker_balance_available",
				Help: "Available balance of the broker on the custody contract",
			},
			[]string{"network", "token", "asset"},
		),
		BrokerChannelCount: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "clearnet_broker_channel_count",
				Help: "Number of channels for the broker on the custody contract",
			},
			[]string{"network"},
		),
		BrokerWalletBalance: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "clearnet_broker_wallet_balance",
				Help: "Broker wallet balance",
			},
			[]string{"network", "token", "asset"},
		),
	}

	return metrics
}

func (m *Metrics) RecordMetricsPeriodically(db *gorm.DB, custodyClients map[string]*Custody) {
	dbTicker := time.NewTicker(15 * time.Second)
	defer dbTicker.Stop()

	balanceTicker := time.NewTicker(30 * time.Second)
	defer balanceTicker.Stop()
	for {
		select {
		case <-dbTicker.C:
			m.UpdateChannelMetrics(db)
			m.UpdateAppSessionMetrics(db)
		case <-balanceTicker.C:
			// Update metrics for each custody client
			for _, client := range custodyClients {

				assets, err := GetAllAssets(db, &client.chainID)
				if err != nil {
					logger.Errorw("failed to retreive assets", "err", err)
					continue
				}

				// Append base asset
				baseAsset := Asset{
					Token:    "0x0000000000000000000000000000000000000000",
					ChainID:  client.chainID,
					Symbol:   "eth",
					Decimals: 18,
				}
				if client.chainID == 137 {
					baseAsset.Symbol = "pol"
				}
				assets = append(assets, baseAsset)

				client.UpdateBalanceMetrics(context.Background(), assets, m)
			}
		}
	}
}

// UpdateChannelMetrics updates the channel metrics from the database
func (m *Metrics) UpdateChannelMetrics(db *gorm.DB) {
	var total, open, closed int64

	db.Model(&Channel{}).Count(&total)
	db.Model(&Channel{}).Where("status = ?", ChannelStatusOpen).Count(&open)
	db.Model(&Channel{}).Where("status = ?", ChannelStatusClosed).Count(&closed)

	m.ChannelsTotal.Set(float64(total))
	m.ChannelsOpen.Set(float64(open))
	m.ChannelsClosed.Set(float64(closed))
}

// UpdateAppSessionMetrics updates the application session metrics from the database
func (m *Metrics) UpdateAppSessionMetrics(db *gorm.DB) {
	var count int64
	db.Model(&AppSession{}).Count(&count)
	m.AppSessionsTotal.Set(float64(count))
}
