#!/bin/bash

echo "========================================="
echo "Online Examination System - Setup Check"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Found: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Install from: https://nodejs.org"
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ Found: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi

# Check Python
echo -n "Checking Python... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Found: $PYTHON_VERSION${NC}"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✓ Found: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Install from: https://python.org"
fi

# Check pip
echo -n "Checking pip... "
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✓ Found: $PIP_VERSION${NC}"
elif command -v pip &> /dev/null; then
    PIP_VERSION=$(pip --version | cut -d' ' -f2)
    echo -e "${GREEN}✓ Found: $PIP_VERSION${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
fi

echo ""
echo "========================================="
echo "Environment Configuration Check"
echo "========================================="
echo ""

# Check backend .env
echo -n "Backend .env file... "
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
    
    # Check if required vars are set
    if grep -q "SUPABASE_URL=https://" backend/.env && \
       grep -q "SUPABASE_KEY=eyJ" backend/.env && \
       grep -q "SESSION_SECRET=" backend/.env; then
        echo -e "  ${GREEN}✓ Configuration looks good${NC}"
    else
        echo -e "  ${YELLOW}⚠ Some required values might be missing${NC}"
        echo "  Check: SUPABASE_URL, SUPABASE_KEY, SESSION_SECRET"
    fi
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Run: cp backend/.env.example backend/.env"
    echo "  Then edit backend/.env with your values"
fi

# Check AI service .env
echo -n "AI Service .env file... "
if [ -f "ai-service/.env" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
    
    if grep -q "GEMINI_API_KEY=AIza" ai-service/.env; then
        echo -e "  ${GREEN}✓ Gemini API key configured${NC}"
    else
        echo -e "  ${YELLOW}⚠ Gemini API key not set${NC}"
        echo "  Get it from: https://makersuite.google.com/app/apikey"
    fi
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Run: cp ai-service/.env.example ai-service/.env"
    echo "  Then add your Gemini API key"
fi

# Check frontend .env
echo -n "Frontend .env file... "
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✓ Exists${NC}"
else
    echo -e "${YELLOW}⚠ Not found (will use defaults)${NC}"
    echo "  Optional: cp frontend/.env.example frontend/.env"
fi

echo ""
echo "========================================="
echo "Dependencies Check"
echo "========================================="
echo ""

# Check backend dependencies
echo -n "Backend dependencies... "
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓ Installed${NC}"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "  Run: cd backend && npm install"
fi

# Check AI service dependencies
echo -n "AI Service dependencies... "
if python3 -c "import fastapi, mediapipe, google.generativeai" 2>/dev/null; then
    echo -e "${GREEN}✓ Installed${NC}"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "  Run: cd ai-service && pip install -r requirements.txt"
fi

# Check frontend dependencies
echo -n "Frontend dependencies... "
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ Installed${NC}"
else
    echo -e "${RED}✗ Not installed${NC}"
    echo "  Run: cd frontend && npm install"
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. If any prerequisites are missing, install them"
echo "2. Create and configure .env files with your API keys"
echo "3. Install dependencies for each service"
echo "4. Run the services in 3 terminals:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd ai-service && python3 main.py"
echo "   Terminal 3: cd frontend && npm run dev"
echo "5. Open http://localhost:5173 in your browser"
echo ""
echo "For detailed instructions, see SETUP_INSTRUCTIONS.md"
echo ""
