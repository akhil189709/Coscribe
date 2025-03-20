import WebSocket,{WebSocketServer} from "ws";
import jwt from "jsonwebtoken"
import dotenv from "dotenv";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET as string
import db from "@repo/db/client"
interface User{
    ws: WebSocket,
    rooms: string[],
    userId: string
}
const users:User[] = [];
const wss = new WebSocketServer({port:8080});
function checkUser(token:string){
    try{
        const decoded = jwt.verify(token,JWT_SECRET);
        if(typeof decoded=="string"){
            return null;
        }
        if(!decoded || !decoded.id){
            return null;
        }
        return decoded.id;
    }
    catch(e){
        console.log(e);
        console.log("JWT didnt verify");
    }
}
wss.on('connection',(ws,req)=>{

    const url = req.url;
    if(!url) return;
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const token = queryParams.get('token') || "";
    const userId = checkUser(token);
    if(!userId) {
        ws.close();
        return;
    }
    users.push({
        userId,
        rooms:[],
        ws
    })
    ws.on('message', async (data)=>{
        const parsedData = JSON.parse(data as unknown as string);
        // console.log(parsedData.type);
        if(parsedData.type==="join_room"){

            try{
                const roomId = (parsedData.roomId);
                if(!roomId || (roomId=="")){
                    return;
                }
                const user = users.find(x=>x.ws === ws);
                const room = await db.room.findUnique({
                    where: { id: roomId }
                });
                if(!room) {
                    ws.close();
                    return;
                }
                user?.rooms.push(parsedData.roomId);
                const updatedRoom = await db.room.update({
                    where: { id: roomId }, // Room ID to update
                    data: {
                      users: {
                        connect: { id: userId }, // Connect the user to the room
                      },
                    },
                  });
            }

            catch(e){
                console.log("An error occured");
                console.log(e);
                return;

            }
        }
        if(parsedData.type==="leave_room"){
            const user = users.find(x=>x.ws==ws);
            if(!user) return;
            user.rooms = user?.rooms.filter(x=>x!==parsedData.roomId)
            const roomId = (parsedData.roomId);

            try{

                const room = await db.room.findUnique({
                    where: { id: roomId },
                    include: { users: true } // Include the users array
                });

                if (!room) return;

                const updatedUsers = room.users.filter((u:any) => u.id !== userId);
                if (updatedUsers.length === 0) {
                    await db.chat.deleteMany({
                        where: { roomId }
                    });
                    await db.room.delete({
                        where: { id: roomId }
                    });
                    return;
                }
                await db.room.update({
                    where: { id: roomId },
                    data: { users: { set: updatedUsers.map((u:any) => ({ id: u.id })) } }
                });
                ws.send(JSON.stringify({
                    status:"OK"
                }))

            }catch(e){
                console.log(e);
                ws.send(JSON.stringify({
                    status:"Error"
                }))
            }
        }
        if(parsedData.type=="chat"){
            const roomId = parsedData.roomId;
            const id = parsedData.id;
            const message = parsedData.message;
            try{
                await db.chat.create({
                    data:{
                        id,
                        roomId:(roomId),
                        message,
                        userId
                    }
                });
                users.forEach(user=>{
                    if(user.rooms.includes(roomId) && user.userId !== userId){
                        user.ws.send(JSON.stringify({
                            type:"chat",
                            id,
                            message:message,
                            roomId
                        }))
                    }
                })
            }
            catch(e){
                console.log("An error occured");
                console.log(e);
                return;
            }
        }
        else if(parsedData.type=="eraser"){
            const roomId = parsedData.roomId;
            const id = parsedData.id;
            // console.log(id);
            try{
                const deleted = await db.chat.deleteMany({
                    where: {
                        id,
                        roomId:(roomId),
                    },
                });
                if (deleted.count > 0) {
                    users.forEach(user => {
                        if (user.rooms.includes(roomId) && user.userId !== userId) {
                            user.ws.send(
                                JSON.stringify({
                                    type: "eraser",
                                    id,
                                    roomId,
                                })
                            );
                        }
                    });
                }
            }catch(e){
                console.log("An error occured");
                console.log(e);
                return;
            }
        }
        else if(parsedData.type=="clean"){
            const roomId = parsedData.roomId;
            users.forEach(user => {
                if (user.rooms.includes(roomId) && user.userId !== userId) {
                    user.ws.send(
                        JSON.stringify({
                            type: "clean",
                            roomId
                        })
                    );
                }
            });
        }
        else if(parsedData.type=="update"){
            const roomId = parsedData.roomId;
            const id = parsedData.id;
            const message = parsedData.message;
            try{
                await db.chat.update({
                    where:{
                        id,
                        roomId: (roomId),
                    },
                    data:{
                        message
                    }
                })
                users.forEach(user => {
                    if (user.rooms.includes(roomId) && user.userId !== userId) {
                        user.ws.send(
                            JSON.stringify({
                                type: "update",
                                id,
                                message,
                                roomId
                            })
                        );
                    }
                });
            }catch(e){
                console.log("An error occured");
                console.log(e);
                return;
            }
        }
    })
});