import { Bid, Token, Transaction } from "../types";
import { getTokenPrices } from "../utils";
import { MoonbeamCall } from '@subql/contract-processors/dist/moonbeam';
import { BigNumber } from "ethers";

type BidCancelledCallArgs = [string, BigNumber, BigNumber, boolean] & { ca: string; tokenId: BigNumber; price: BigNumber; escrowed: boolean};

export async function handleBidCancelled(event: MoonbeamCall<BidCancelledCallArgs>): Promise<void> {
    let transaction = await Transaction.get(event.hash);
    if (!event.success || typeof transaction !== 'undefined') {
        return;
    }

    const id = `${event.args.ca}-${event.args.tokenId.toBigInt()}`;

    // REMOVE CURRENT BID
    let bid = null;
    const bids = await Bid.getByTokenId(id);
    for (let _bid of bids) {
        if (_bid.buyer.toLowerCase() == event.from.toLowerCase() && _bid.value == event.args.price.toBigInt()) {
            bid = _bid;
            break;
        } 
    }

    if (bid !== null) {
        await Bid.remove(bid.id);

        // UPDATE TOKEN
        let token = await Token.get(id);
        let [lowestBid, heighestBid] =  await getTokenPrices(id);
        token.lowestBid = lowestBid;
        token.heighestBid = heighestBid;
        await token.save();

        logger.info(`[BID CANCELLED] tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}; from: ${event.from}; price: ${event.args.price.toBigInt()}`)
    } else {
        logger.error(`[BID CANCELLED] failed! tx: ${event.hash}; token: ${event.args.tokenId}; collection: ${event.args.ca}; from: ${event.from}; price: ${event.args.price.toBigInt()}`)
    }

    // SAVE TRANSACTION
    transaction = new Transaction(event.hash);
    transaction.timestamp = BigInt(event.timestamp);
    await transaction.save();
}