import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { 
    DynamoDBDocumentClient, 
    PutCommand, 
    GetCommand 
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TableName = process.env.TABLE_NAME;


export const dashboard = async(data:any, user:any ) => {

}

export const statistic = async(data:any, user:any) => {

}

export const riwayat = async(data:any, user:any) => {

}

export const kategori = async(data:any, user:any) => {

}