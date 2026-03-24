#!/bin/bash
# Script to pull and set up Ollama models automatically

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get model name from environment or use default
MODEL=${OLLAMA_MODEL:-llama3.1:8b}
OLLAMA_HOST=${OLLAMA_HOST:-http://ollama:11434}

echo -e "${YELLOW}Setting up Ollama model: $MODEL at $OLLAMA_HOST${NC}"

# Function to check if Ollama is available
check_ollama_status() {
  local max_attempts=30
  local attempt=1
  local status=false
  
  echo -e "${YELLOW}Waiting for Ollama service to be available...${NC}"
  
  while [ $attempt -le $max_attempts ]; do
    # Try to ping the Ollama API
    if curl --silent --max-time 5 "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1; then
      echo -e "${GREEN}Ollama service is available!${NC}"
      status=true
      break
    fi
    
    echo -e "${YELLOW}Attempt $attempt/$max_attempts: Ollama service not ready yet. Waiting...${NC}"
    sleep 2
    attempt=$((attempt + 1))
  done
  
  if [ "$status" = false ]; then
    echo -e "${RED}Ollama service is not available after $max_attempts attempts.${NC}"
    echo -e "${RED}Please check if Ollama is running properly.${NC}"
    return 1
  fi
  
  return 0
}

# Function to pull Ollama model
pull_ollama_model() {
  local model=$1
  local max_attempts=3
  local attempt=1
  
  echo -e "${YELLOW}Pulling Ollama model: $model${NC}"
  
  while [ $attempt -le $max_attempts ]; do
    # Try to pull the model
    if curl --silent --max-time 120 -X POST "${OLLAMA_HOST}/api/pull" -d "{\"name\":\"$model\"}" > /dev/null 2>&1; then
      echo -e "${GREEN}Successfully pulled Ollama model: $model${NC}"
      return 0
    fi
    
    echo -e "${YELLOW}Attempt $attempt/$max_attempts: Failed to pull model. Retrying...${NC}"
    sleep 2
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}Failed to pull Ollama model: $model after $max_attempts attempts.${NC}"
  return 1
}

# Main script execution
main() {
  # Check if Ollama service is available
  if ! check_ollama_status; then
    echo -e "${RED}Skipping model setup due to Ollama service unavailability.${NC}"
    return 1
  fi
  
  # Pull the model
  if ! pull_ollama_model "$MODEL"; then
    echo -e "${RED}Failed to set up Ollama model.${NC}"
    echo -e "${YELLOW}The system will attempt to use the model anyway, which may succeed if it's already available.${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Ollama model setup completed successfully!${NC}"
  return 0
}

# Run the main function
main
exit $?