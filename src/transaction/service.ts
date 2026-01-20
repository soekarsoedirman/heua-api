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


export const newTransaktion = async (data:any, user:any) => {
    const userEmail = (user as any).email;

}

export const editTransaction = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}

export const deleteTransaction = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}

export const newDebt = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}

export const editDebt = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}

export const deleteDebt = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}

export const newCategory = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}

export const editCategory = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}

export const deleteCategory = async (data:any, user:any) => {
    const userEmail = (user as any).email;
}