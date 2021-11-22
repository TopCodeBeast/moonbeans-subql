import { Bid, Ask } from "./types";

export async function getTokenPrices(id: string): Promise<[bigint, bigint]> {
    let floorPrice = null;
    let ceilingPrice = null;

    let bids = await Bid.getByTokenId(id);
    if (bids.length > 0) {
        for (let bid of bids) {
            if (floorPrice === null || bid.value <= floorPrice) {
                floorPrice = bid.value
            }
            if (ceilingPrice === null || bid.value >= ceilingPrice) {
                ceilingPrice = bid.value;
            }
        }
    }

    if (floorPrice === null) {
        floorPrice = 0;
    }
    if (ceilingPrice === null) {
        ceilingPrice = 0;
    }

    return [BigInt(floorPrice), BigInt(ceilingPrice)];
}

export async function getCollectionPrices(collectionId: string): Promise<[bigint, bigint]> {
    let floorPrice = null;
    let ceilingPrice = null;

    let asks = await Ask.getByCollectionId(collectionId);
    if (asks.length > 0) {
        for (let ask of asks) {
            if (floorPrice === null || ask.value <= floorPrice) {
                floorPrice = ask.value
            }
            if (ceilingPrice === null || ask.value >= ceilingPrice) {
                ceilingPrice = ask.value;
            }
        }
    }

    if (floorPrice === null) {
        floorPrice = 0;
    }
    if (ceilingPrice === null) {
        ceilingPrice = 0;
    }

    return [BigInt(floorPrice), BigInt(ceilingPrice)];
}