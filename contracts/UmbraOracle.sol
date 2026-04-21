// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title UmbraOracle - Chainlink Price Feed Wrapper for Umbra Protocol
/// @author ChainGPT (base) + Umbra Protocol (decimal fix)
/// @notice Fetches ETH/USD and USDC/USD prices and computes user health factors
/// @dev Designed for Arbitrum Sepolia with Chainlink feeds

import "@openzeppelin/contracts/access/Ownable.sol";

/// @dev Minimal Chainlink AggregatorV3Interface
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function decimals() external view returns (uint8);
}

contract UmbraOracle is Ownable {
    /// @notice Error thrown when a Chainlink price is stale
    error StalePrice(string feed, uint256 updatedAt, uint256 currentTime);

    /// @notice Emitted when ETH price is fetched
    event ETHPriceQueried(uint256 price, uint256 updatedAt);

    /// @notice Emitted when USDC price is fetched
    event USDCPriceQueried(uint256 price, uint256 updatedAt);

    /// @notice Emitted when a user's health factor is calculated
    event HealthFactorCalculated(
        address indexed user,
        uint256 collateralAmountETH,
        uint256 debtAmountUSDC,
        uint256 healthFactor
    );

    /// @dev Immutable Chainlink price feed addresses
    AggregatorV3Interface public immutable ethUsdFeed;
    AggregatorV3Interface public immutable usdcUsdFeed;

    /// @dev Maximum price staleness in seconds (1 hour)
    uint256 private constant MAX_PRICE_AGE = 1 hours;

    /// @dev Chainlink feeds on Arbitrum Sepolia
    /// ETH/USD: 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165
    /// USDC/USD: 0x0153002d20B96532C639313c2d54c3dA09109309

    /// @param _ethUsdFeed Address of Chainlink ETH/USD price feed
    /// @param _usdcUsdFeed Address of Chainlink USDC/USD price feed
    constructor(address _ethUsdFeed, address _usdcUsdFeed)
        Ownable(msg.sender)
    {
        require(_ethUsdFeed != address(0), "Invalid ETH/USD feed address");
        require(_usdcUsdFeed != address(0), "Invalid USDC/USD feed address");
        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
        usdcUsdFeed = AggregatorV3Interface(_usdcUsdFeed);
    }

    /// @notice Returns latest ETH price in USD (8 decimals)
    /// @dev Reverts if price is older than 1 hour
    /// @return price Latest ETH/USD price with 8 decimals
    function getETHPrice() external view returns (uint256 price) {
        price = _getPriceView(ethUsdFeed, "ETH/USD");
    }

    /// @notice Returns latest USDC price in USD (8 decimals)
    /// @dev Reverts if price is older than 1 hour
    /// @return price Latest USDC/USD price with 8 decimals
    function getUSDCPrice() external view returns (uint256 price) {
        price = _getPriceView(usdcUsdFeed, "USDC/USD");
    }

    /// @notice Computes user's health factor for a lending position
    /// @dev Normalizes both collateral and debt to 8-decimal USD values before dividing
    ///      collateralValueUSD = (collateralAmountETH * ethPrice) / 1e18  → 8 decimals
    ///      debtValueUSD       = (debtAmountUSDC * usdcPrice) / 1e6       → 8 decimals
    ///      healthFactor       = (collateralValueUSD * 100) / debtValueUSD
    /// @param collateralAmountETH Amount of collateral in ETH (18 decimals)
    /// @param debtAmountUSDC Amount of debt in USDC (6 decimals)
    /// @return healthFactor Health factor where < 100 means liquidatable
    function getHealthFactor(
        uint256 collateralAmountETH,
        uint256 debtAmountUSDC
    ) external view returns (uint256 healthFactor) {
        uint256 ethPrice  = _getPriceView(ethUsdFeed,  "ETH/USD");
        uint256 usdcPrice = _getPriceView(usdcUsdFeed, "USDC/USD");

        // Normalize to 8-decimal USD values
        uint256 collateralValueUSD = (collateralAmountETH * ethPrice)  / 1e18;
        uint256 debtValueUSD       = (debtAmountUSDC      * usdcPrice) / 1e6;

        if (debtValueUSD == 0) {
            healthFactor = type(uint256).max;
        } else {
            healthFactor = (collateralValueUSD * 100) / debtValueUSD;
        }
    }

    /// @notice Returns latest ETH price and emits event (non-view)
    function getETHPriceWithEvent() external returns (uint256 price) {
        price = _getPrice(ethUsdFeed, "ETH/USD");
    }

    /// @notice Returns latest USDC price and emits event (non-view)
    function getUSDCPriceWithEvent() external returns (uint256 price) {
        price = _getPrice(usdcUsdFeed, "USDC/USD");
    }

    /// @notice Computes health factor and emits event (non-view)
    /// @param collateralAmountETH Amount of collateral in ETH (18 decimals)
    /// @param debtAmountUSDC Amount of debt in USDC (6 decimals)
    /// @return healthFactor Health factor where < 100 means liquidatable
    function getHealthFactorWithEvent(
        uint256 collateralAmountETH,
        uint256 debtAmountUSDC
    ) external returns (uint256 healthFactor) {
        uint256 ethPrice  = _getPrice(ethUsdFeed,  "ETH/USD");
        uint256 usdcPrice = _getPrice(usdcUsdFeed, "USDC/USD");

        uint256 collateralValueUSD = (collateralAmountETH * ethPrice)  / 1e18;
        uint256 debtValueUSD       = (debtAmountUSDC      * usdcPrice) / 1e6;

        if (debtValueUSD == 0) {
            healthFactor = type(uint256).max;
        } else {
            healthFactor = (collateralValueUSD * 100) / debtValueUSD;
        }

        emit HealthFactorCalculated(
            msg.sender,
            collateralAmountETH,
            debtAmountUSDC,
            healthFactor
        );
    }

    /// @dev Internal view helper — fetches and validates price, no event
    function _getPriceView(
        AggregatorV3Interface feed,
        string memory feedName
    ) internal view returns (uint256 price) {
        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,
        ) = feed.latestRoundData();

        if (block.timestamp - updatedAt > MAX_PRICE_AGE) {
            revert StalePrice(feedName, updatedAt, block.timestamp);
        }

        require(answer > 0, "Invalid price");

        uint8 dec = feed.decimals();
        if (dec > 8) {
            price = uint256(answer) / (10 ** (dec - 8));
        } else if (dec < 8) {
            price = uint256(answer) * (10 ** (8 - dec));
        } else {
            price = uint256(answer);
        }
    }

    /// @dev Internal non-view helper — fetches, validates price, emits event
    function _getPrice(
        AggregatorV3Interface feed,
        string memory feedName
    ) internal returns (uint256 price) {
        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,
        ) = feed.latestRoundData();

        if (block.timestamp - updatedAt > MAX_PRICE_AGE) {
            revert StalePrice(feedName, updatedAt, block.timestamp);
        }

        require(answer > 0, "Invalid price");

        uint8 dec = feed.decimals();
        if (dec > 8) {
            price = uint256(answer) / (10 ** (dec - 8));
        } else if (dec < 8) {
            price = uint256(answer) * (10 ** (8 - dec));
        } else {
            price = uint256(answer);
        }

        if (feed == ethUsdFeed) {
            emit ETHPriceQueried(price, updatedAt);
        } else if (feed == usdcUsdFeed) {
            emit USDCPriceQueried(price, updatedAt);
        }
    }
}