const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));
  });

  describe("Liquidity Management", function () {
    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const reserves = await dex.getReserves();
      expect(reserves._reserveA).to.equal(ethers.utils.parseEther("100"));
      expect(reserves._reserveB).to.equal(ethers.utils.parseEther("200"));
    });

    it("should mint correct LP tokens for first provider", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const liquidity = await dex.liquidity(owner.address);
      const expectedLiquidity = ethers.utils.parseEther("141.421356237309504880"); // sqrt(100 * 200)
      expect(liquidity).to.be.closeTo(expectedLiquidity, ethers.utils.parseEther("0.01"));
    });

    it("should allow subsequent liquidity additions", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      await dex.addLiquidity(ethers.utils.parseEther("50"), ethers.utils.parseEther("100"));
      const reserves = await dex.getReserves();
      expect(reserves._reserveA).to.equal(ethers.utils.parseEther("150"));
      expect(reserves._reserveB).to.equal(ethers.utils.parseEther("300"));
    });

    it("should maintain price ratio on liquidity addition", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const priceBefore = await dex.getPrice();
      await dex.addLiquidity(ethers.utils.parseEther("50"), ethers.utils.parseEther("100"));
      const priceAfter = await dex.getPrice();
      expect(priceBefore).to.equal(priceAfter);
    });

    it("should allow partial liquidity removal", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const liquidityBefore = await dex.liquidity(owner.address);
      await dex.removeLiquidity(liquidityBefore.div(2));
      const liquidityAfter = await dex.liquidity(owner.address);
      expect(liquidityAfter).to.be.closeTo(liquidityBefore.div(2), ethers.utils.parseEther("0.01"));
    });

    it("should return correct token amounts on liquidity removal", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const liquidity = await dex.liquidity(owner.address);
      const balanceABefore = await tokenA.balanceOf(owner.address);
      const balanceBBefore = await tokenB.balanceOf(owner.address);
      await dex.removeLiquidity(liquidity);
      const balanceAAfter = await tokenA.balanceOf(owner.address);
      const balanceBAfter = await tokenB.balanceOf(owner.address);
      expect(balanceAAfter.sub(balanceABefore)).to.equal(ethers.utils.parseEther("100"));
      expect(balanceBAfter.sub(balanceBBefore)).to.equal(ethers.utils.parseEther("200"));
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(dex.addLiquidity(0, ethers.utils.parseEther("100")))
        .to.be.revertedWith("Amounts must be greater than 0");
    });

    it("should revert when removing more liquidity than owned", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const liquidity = await dex.liquidity(owner.address);
      await expect(dex.removeLiquidity(liquidity.add(1)))
        .to.be.revertedWith("Insufficient liquidity");
    });
  });

  describe("Token Swaps", function () {
    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      const balanceBefore = await tokenB.balanceOf(owner.address);
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const balanceAfter = await tokenB.balanceOf(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should swap token B for token A", async function () {
      const balanceBefore = await tokenA.balanceOf(owner.address);
      await dex.swapBForA(ethers.utils.parseEther("20"));
      const balanceAfter = await tokenA.balanceOf(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should calculate correct output amount with fee", async function () {
      const amountOut = await dex.getAmountOut(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const expected = ethers.utils.parseEther("18.148847912322730732");
      expect(amountOut).to.be.closeTo(expected, ethers.utils.parseEther("0.01"));
    });

    it("should update reserves after swap", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const reserves = await dex.getReserves();
      expect(reserves._reserveA).to.equal(ethers.utils.parseEther("110"));
    });

    it("should increase k after swap due to fees", async function () {
      const reservesBefore = await dex.getReserves();
      const kBefore = reservesBefore._reserveA.mul(reservesBefore._reserveB);
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const reservesAfter = await dex.getReserves();
      const kAfter = reservesAfter._reserveA.mul(reservesAfter._reserveB);
      expect(kAfter).to.be.gt(kBefore);
    });

    it("should revert on zero swap amount", async function () {
      await expect(dex.swapAForB(0)).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should handle large swaps with high price impact", async function () {
      const balanceBefore = await tokenB.balanceOf(owner.address);
      await dex.swapAForB(ethers.utils.parseEther("50"));
      const balanceAfter = await tokenB.balanceOf(owner.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should handle multiple consecutive swaps", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.swapBForA(ethers.utils.parseEther("20"));
      await dex.swapAForB(ethers.utils.parseEther("5"));
      const reserves = await dex.getReserves();
      expect(reserves._reserveA).to.be.gt(0);
      expect(reserves._reserveB).to.be.gt(0);
    });
  });

  describe("Price Calculations", function () {
    it("should return correct initial price", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const price = await dex.getPrice();
      expect(price).to.equal(ethers.utils.parseEther("2"));
    });

    it("should update price after swaps", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const priceBefore = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const priceAfter = await dex.getPrice();
      expect(priceAfter).to.not.equal(priceBefore);
    });

    it("should handle price queries with zero reserves gracefully", async function () {
      await expect(dex.getPrice()).to.be.revertedWith("No liquidity");
    });
  });

  describe("Fee Distribution", function () {
    it("should accumulate fees for liquidity providers", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const liquidity = await dex.liquidity(owner.address);
      await dex.removeLiquidity(liquidity);
      const balanceA = await tokenA.balanceOf(owner.address);
      expect(balanceA).to.be.gt(ethers.utils.parseEther("999900"));
    });

    it("should distribute fees proportionally to LP share", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      await tokenA.transfer(addr1.address, ethers.utils.parseEther("100"));
      await tokenB.transfer(addr1.address, ethers.utils.parseEther("200"));
      await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("100"));
      await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("200"));
      await dex.connect(addr1).addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      
      await dex.swapAForB(ethers.utils.parseEther("10"));
      
      const liquidityOwner = await dex.liquidity(owner.address);
      const liquidityAddr1 = await dex.liquidity(addr1.address);
      expect(liquidityOwner).to.be.closeTo(liquidityAddr1, ethers.utils.parseEther("0.01"));
    });
  });

  describe("Edge Cases", function () {
    it("should handle very small liquidity amounts", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("0.001"), ethers.utils.parseEther("0.002"));
      const reserves = await dex.getReserves();
      expect(reserves._reserveA).to.equal(ethers.utils.parseEther("0.001"));
    });

    it("should handle very large liquidity amounts", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("10000"), ethers.utils.parseEther("20000"));
      const reserves = await dex.getReserves();
      expect(reserves._reserveA).to.equal(ethers.utils.parseEther("10000"));
    });

    it("should prevent unauthorized access", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const liquidity = await dex.liquidity(owner.address);
      await expect(dex.connect(addr1).removeLiquidity(liquidity))
        .to.be.revertedWith("Insufficient liquidity");
    });
  });

  describe("Events", function () {
    it("should emit LiquidityAdded event", async function () {
      await expect(dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200")))
        .to.emit(dex, "LiquidityAdded")
        .withArgs(owner.address, ethers.utils.parseEther("100"), ethers.utils.parseEther("200"), ethers.constants.MaxUint256);
    });

    it("should emit LiquidityRemoved event", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      const liquidity = await dex.liquidity(owner.address);
      await expect(dex.removeLiquidity(liquidity))
        .to.emit(dex, "LiquidityRemoved");
    });

    it("should emit Swap event", async function () {
      await dex.addLiquidity(ethers.utils.parseEther("100"), ethers.utils.parseEther("200"));
      await expect(dex.swapAForB(ethers.utils.parseEther("10")))
        .to.emit(dex, "Swap");
    });
  });
});
