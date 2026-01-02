# Decentralized Exchange (DEX) with Automated Market Maker (AMM)

## Overview

This project implements a Decentralized Exchange (DEX) using the Automated Market Maker (AMM) protocol based on the constant product formula (x * y = k). The DEX allows users to swap between two ERC20 tokens and provide liquidity to earn rewards.

## Features

- **Liquidity Provision**: Users can add liquidity to the pool and receive LP tokens representing their share
- **Token Swapping**: Seamless token swaps using the constant product formula
- **Fair Pricing**: Automatic price discovery based on pool reserves
- **LP Token System**: Proportional reward distribution to liquidity providers
- **Slippage Protection**: Built-in mechanisms to prevent excessive price impact

## Architecture

### Smart Contracts

#### DEX.sol
The main contract implementing the AMM logic with the following key functions:
- `addLiquidity(uint256 amountA, uint256 amountB)`: Add liquidity to the pool
- `removeLiquidity(uint256 liquidity)`: Remove liquidity and burn LP tokens
- `swapAForB(uint256 amountAIn)`: Swap token A for token B
- `swapBForA(uint256 amountBIn)`: Swap token B for token A
- `getPrice(address token)`: Get current price of a token
- `getReserves()`: Get current pool reserves
- `getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)`: Calculate output amount

#### MockERC20.sol
A simple ERC20 token implementation for testing purposes.

## Mathematical Implementation

### Constant Product Formula
The AMM uses the constant product formula:
```
x * y = k
```
Where:
- x = reserve of token A
- y = reserve of token B
- k = constant product

### Price Calculation
```
price_A = reserveB / reserveA
price_B = reserveA / reserveB
```

### Swap Calculation
For a swap, the output amount is calculated as:
```
amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
```

### LP Token Calculation
On first liquidity provision:
```
liquidity = sqrt(amountA * amountB)
```

On subsequent additions:
```
liquidity = min((amountA * totalSupply) / reserveA, (amountB * totalSupply) / reserveB)
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JallaShalini/Automated_Market_Maker_Protocol.git
cd Automated_Market_Maker_Protocol
```

2. Install dependencies:
```bash
npm install
```

3. Compile contracts:
```bash
npx hardhat compile
```

### Running Tests

#### Local Testing
```bash
npm test
```

#### Docker Testing
```bash
# Build and start the container
docker-compose up -d

# Run tests inside the container
docker-compose exec app npm test

# View test coverage
docker-compose exec app npm run coverage

# Stop the container
docker-compose down
```

## Project Structure

```
.
├── contracts/
│   ├── DEX.sol              # Main AMM implementation
│   └── MockERC20.sol        # ERC20 token for testing
├── test/
│   └── DEX.test.js          # Comprehensive test suite
├── scripts/
│   └── deploy.js            # Deployment script
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker Compose configuration
├── hardhat.config.js        # Hardhat configuration
├── package.json             # Node.js dependencies
├── .gitignore              # Git ignore rules
├── .dockerignore           # Docker ignore rules
└── README.md               # This file
```

## Testing

The project includes comprehensive tests covering:
- Initial liquidity provision
- LP token minting and burning
- Token swaps in both directions
- Price impact calculations
- Slippage scenarios
- Edge cases and error conditions

Run tests with coverage:
```bash
npm run coverage
```

Expected test coverage: ≥80%

## Deployment

To deploy the contracts to a network:

1. Configure your network in `hardhat.config.js`
2. Set up your environment variables (private key, RPC URL)
3. Run the deployment script:
```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

## Security Considerations

- The contract uses OpenZeppelin's SafeMath-equivalent operations (Solidity 0.8.x built-in overflow checks)
- Reentrancy protection through checks-effects-interactions pattern
- Integer overflow protection through Solidity 0.8.x
- Proper authorization checks on sensitive functions

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.
