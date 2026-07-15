import app from "./app";
import { PORT } from "./configs";
import http from "http";
import { initSocket } from "./realtime/socket";
import { connectDB } from "./database/mogodb";

//server part
async function startServer(){
    await connectDB();
    const server = http.createServer(app);
    initSocket(server);

    server.listen(
        PORT,
        () =>{          
            console.log(`Server: http://localhost:${PORT}`);
        }
    )
}

startServer();
