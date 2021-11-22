import { Bid, Token, Transaction } from "../types";
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type BidPlacedCallrgs = [string, BigNumber, BigNumber] & { ca: string; tokenId: BigNumber; price: BigNumber; };

export async function handleBidPlaced(event: MoonbeamCall<BidPlacedCallrgs>): Promise<void> {
    let transaction = await Transaction.get(event.hash);
    if (!event.success || typeof transaction !== 'undefined') {
        return;
    }

    const id = `${event.args.ca}-${event.args.tokenId.toBigInt()}`;
    const bidId = `${event.args.ca}-${event.args.tokenId.toBigInt()}-${event.from}-${event.hash}`;
    const price = event.args.price.toBigInt();

    // SAVE OR UPDATE TOKEN
    let token = await Token.get(id);
    if (typeof token === 'undefined') {
        logger.info(BigInt(0))
        token = new Token(id);
        token.tokenId = event.args.tokenId.toBigInt();
        token.collectionId = event.args.ca;
        token.currentAsk = BigInt(0);
        token.lowestBid = price;
        token.heighestBid = price;
        await token.save();
    } else {
        let tokenUpdate = false;
        if (token.heighestBid <= price) {
            token.heighestBid = price;
            tokenUpdate = true;
        }
    
        if (token.lowestBid >= price) {
            token.lowestBid = price;
            tokenUpdate = true;
        }
    
        if (tokenUpdate) {
            await token.save();
        }
    }

    // SAVE BID
    const bid = new Bid(bidId);
    bid.tokenId = id;
    bid.collectionId = event.args.ca;
    bid.value = event.args.price.toBigInt();
    bid.buyer = event.from;
    bid.timestamp = BigInt(event.timestamp);
    bid.txHash = event.hash;
    await bid.save();
    
    logger.info(`[BID PLACED] tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}; price: ${event.args.price.toBigInt()}`)

    // SAVE TRANSACTION
    transaction = new Transaction(event.hash);
    transaction.timestamp = BigInt(event.timestamp);
    await transaction.save();
}