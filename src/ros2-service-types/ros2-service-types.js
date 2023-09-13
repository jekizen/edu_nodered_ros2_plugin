// RED argument provides the module access to Node-RED runtime api
module.exports = function(RED)
{
    var execFile = require('child_process').execFile;    
    var fs = require('fs');
    var ros2_home = '/opt/ros/' + process.env.ROS_DISTRO;
    if (process.env.IS_ROS2_PATH) {
        ros2_home = process.env.IS_ROS2_PATH;
    }

    /*
     * @function ROS2ServiceTypes constructor
     * This node is defined by the constructor function ROS2ServiceTypes,
     * which is called when a new instance of the node is created
     *
     * @param {Object} config - Contains the properties set in the flow editor
     */
    function ROS2ServiceTypes(config)
    {
        // Initiliaze the features shared by all nodes
        RED.nodes.createNode(this, config);
        var node = this;

        // Event emitted when the deploy is finished
        RED.events.once("flows:started", function() {
            node.status({ fill: "green", shape: "dot", text: ""});
        });

	    // Registers a listener to the input event,
        // which will be called whenever a message arrives at this node
        node.on('input', function(msg) {
            // Passes the message to the next node in the flow
            node.send(msg);
        });

        // Called when there is a re-deploy or the program is closed
        node.on('close', function() {
            node.status({ fill: null, shape: null, text: ""});            
        });
    }

    // The node is registered in the runtime using the name publisher
    RED.nodes.registerType("ROS2 Service Type", ROS2ServiceTypes);

    // Function that pass the IS ROS 2 compiled packages to the html file
    RED.httpAdmin.get("/ros2srvspackages", RED.auth.needsPermission('ROS2 Service Type.read'), function(req,res)
    {
        console.log("Estimate all packages that provide services.");
        execFile("ros2", ["interface", "list"], function(error, stdout, stderr) {    
            var found_service_start = false;
            var package_list = [];
            
            stdout.split('\n').forEach(line => {
                if (found_service_start == false && line.includes("Services:")) {
                    // found start of services --> processing list at next iteration
                    found_service_start = true;
                    return;
                }
                if (found_service_start == false) {
                    // no services --> no processing
                    return;
                }
                if (found_service_start == true && line.includes("Actions:")) {
                    // end of services reached --> stop processing
                    found_service_start = false;
                    return;
                }

                line = line.trim();
                let package = line.split('/')[0]

                if (package_list.includes(package) == false) {
                    package_list.push(package);
                }
            });

            console.log("Found following packages that provide services:");
            console.log(package_list);
            res.json(package_list);
        });
    });

    // Function that pass the IS ROS 2 package compiled msgs to the html file
    RED.httpAdmin.get("/ros2srvs", RED.auth.needsPermission('ROS2 Service Type.read'), function(req,res)
    {
        console.log("Estimate all services that is provided by package '" + req.query["package"] + "':");
        execFile("ros2", ["interface", "list"], function(error, stdout, stderr) {    
            var found_service_start = false;
            var service_list = [];
            
            stdout.split('\n').forEach(line => {
                if (found_service_start == false && line.includes("Services:")) {
                    // found start of services --> processing list at next iteration
                    found_service_start = true;
                    return;
                }
                if (found_service_start == false) {
                    // no services --> no processing
                    return;
                }
                if (found_service_start == true && line.includes("Actions:")) {
                    // end of services reached --> stop processing
                    found_service_start = false;
                    return;
                }

                line = line.trim();
                line_parts = line.split('/');

                if (line_parts[0] == req.query['package']) {
                    service_list.push(line_parts[2]);
                }
            });

            console.log("Found following services that is provided by package '" + req.query["package"] + "':");
            console.log(service_list);
            res.json(service_list);
        });
    });

    // Function that pass the selected message idl and srv codes
    RED.httpAdmin.get("/srvidl", RED.auth.needsPermission('ROS2 Service Type.read'), function(req,res)
    {
        if (req.query['srv'])
        {
            var json_data = {}
            // IDL
            var msg_path = ros2_home + "/share/" + req.query['package'] + "/srv/" + req.query['srv'];

            var idl = fs.readFileSync(msg_path + ".idl").toString();
            json_data["idl"] = idl;

            // MSG
            if (fs.existsSync(msg_path + ".srv"))
            {
                var srv = fs.readFileSync(msg_path + ".srv").toString();
                json_data["srv"] = srv;
            }
            else
            {
                json_data["srv"] = "";
            }
            res.json(json_data);
        }
    });
}
