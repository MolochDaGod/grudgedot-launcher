#!/bin/bash

# grudgeDot Deployment Script
# This script helps deploy the application to various environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose is installed"
}

# Deploy locally with Docker
deploy_local() {
    print_info "Deploying locally with Docker..."
    
    if [ ! -f .env ]; then
        print_info "Creating .env file from .env.example"
        cp .env.example .env
        print_info "Please edit .env file with your configuration"
    fi
    
    print_info "Building Docker images..."
    docker-compose build
    
    print_info "Starting services..."
    docker-compose up -d
    
    print_success "Local deployment complete!"
    print_info "Services are running at:"
    echo "  - AI Agents: http://localhost:3001"
    echo "  - Game Server: http://localhost:3002"
    echo "  - Cloud Storage: http://localhost:3003"
    
    print_info "Check status with: docker-compose ps"
    print_info "View logs with: docker-compose logs -f"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    print_info "Deploying to Kubernetes..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Check if secrets file exists
    if [ ! -f deploy/kubernetes/secrets.yaml ]; then
        print_info "Creating secrets file from example"
        cp deploy/kubernetes/secrets.yaml.example deploy/kubernetes/secrets.yaml
        print_error "Please edit deploy/kubernetes/secrets.yaml with your credentials"
        exit 1
    fi
    
    print_info "Applying Kubernetes manifests..."
    
    # Create namespace and configmap
    kubectl apply -f deploy/kubernetes/configmap.yaml
    print_success "ConfigMap applied"
    
    # Create secrets
    kubectl apply -f deploy/kubernetes/secrets.yaml
    print_success "Secrets applied"
    
    # Deploy databases
    kubectl apply -f deploy/kubernetes/mongodb.yaml
    print_success "MongoDB deployed"
    
    kubectl apply -f deploy/kubernetes/redis.yaml
    print_success "Redis deployed"
    
    # Wait for databases to be ready
    print_info "Waiting for databases to be ready..."
    kubectl wait --for=condition=ready pod -l app=mongodb -n grudgedot --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n grudgedot --timeout=300s
    print_success "Databases are ready"
    
    # Deploy services
    kubectl apply -f deploy/kubernetes/ai-agents.yaml
    print_success "AI Agents deployed"
    
    kubectl apply -f deploy/kubernetes/game-server.yaml
    print_success "Game Server deployed"
    
    kubectl apply -f deploy/kubernetes/cloud-storage.yaml
    print_success "Cloud Storage deployed"
    
    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/ai-agents \
        deployment/game-server \
        deployment/cloud-storage \
        -n grudgedot
    
    print_success "Kubernetes deployment complete!"
    print_info "Get service URLs with: kubectl get services -n grudgedot"
}

# Stop local deployment
stop_local() {
    print_info "Stopping local deployment..."
    docker-compose down
    print_success "Services stopped"
}

# Show status
show_status() {
    print_info "Current deployment status:"
    
    echo ""
    echo "Docker services:"
    docker-compose ps
    
    if command -v kubectl &> /dev/null; then
        echo ""
        echo "Kubernetes deployments:"
        kubectl get deployments -n grudgedot 2>/dev/null || echo "  Not deployed to Kubernetes"
        
        echo ""
        echo "Kubernetes services:"
        kubectl get services -n grudgedot 2>/dev/null || echo "  Not deployed to Kubernetes"
    fi
}

# Main script
main() {
    echo "========================================"
    echo "   grudgeDot Deployment"
    echo "========================================"
    echo ""
    
    case "${1}" in
        local)
            check_prerequisites
            deploy_local
            ;;
        kubernetes|k8s)
            deploy_kubernetes
            ;;
        stop)
            stop_local
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 {local|kubernetes|stop|status}"
            echo ""
            echo "Commands:"
            echo "  local       - Deploy locally with Docker Compose"
            echo "  kubernetes  - Deploy to Kubernetes cluster"
            echo "  stop        - Stop local Docker deployment"
            echo "  status      - Show deployment status"
            exit 1
            ;;
    esac
}

main "$@"
