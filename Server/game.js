var GP = 
{
	GameWidth: 1000,				// In pixels
	GameHeight: 600,			// In pixels
	GameFrameTime: 20,			// In miliseconds
	CarRadius: 30,				// In pixels
	FrictionMultiplier: 0.97,	// Unitless
	MaxSpeed: 6,				// In pixels per game frame
	TurnSpeed: 0.1,				// In radians per game frame
	Acceleration: 0.3			// In (pixels per game frame) per game frame
};

function RunGameFrame(Cars)
{
	// [ Index of first car, Index of second car, X impulse, y Impulse ]
	var Impulses = [];
	
	for (i = 0; i < Cars.length; i++)
	{
		// Move the cars. X and Y are the coordinates of the center of the car
		Cars[i].X += Cars[i].VX;
		Cars[i].Y += Cars[i].VY;
		
		// Check the proximity to the left and right walls
		if (Cars[i].X <= GP.CarRadius || Cars[i].X >= GP.GameWidth - GP.CarRadius)
		{
			// See notes in book...
			if ((Cars[i].X <= GP.CarRadius && Cars[i].VX <= 0)
				|| (Cars[i].X >= GP.GameWidth - GP.CarRadius && Cars[i].VX >= 0))
			{
				Impulses.push([i, null, 2 * Cars[i].VX, 0]); // Turn the car away
			}
			
			// Make the walls truly rigid. If the car pushed into the wall, push it back out
			if (Cars[i].X <= GP.CarRadius)
			{
				Cars[i].X = GP.CarRadius;
			}
			if (Cars[i].X >= GP.GameWidth - GP.CarRadius)
			{
				Cars[i].X = GP.GameWidth - GP.CarRadius;
			}
		}
		
		// Check the proximity to the top and bottom walls
		if (Cars[i].Y <= GP.CarRadius || Cars[i].Y >= GP.GameHeight - GP.CarRadius)
		{
			// See notes in book...
			if ((Cars[i].Y <= GP.CarRadius && Cars[i].VY <= 0)
				|| (Cars[i].Y >= GP.GameHeight - GP.CarRadius && Cars[i].VY >= 0))
			{
				Impulses.push([i, null, 0, 2 * Cars[i].VY]); // Turn the car away
			}
			
			// Make the walls truly rigid. If the car pushed into the wall, push it back out
			if (Cars[i].Y <= GP.CarRadius)
			{
				Cars[i].Y = GP.CarRadius;
			}
			if (Cars[i].Y >= GP.GameHeight - GP.CarRadius)
			{
				Cars[i].Y = GP.GameHeight - GP.CarRadius;
			}
		}
        
        // Check for colllisions between cars
        for (var j = i + 1; j < Cars.length; j++)
        {
            // distance between centers of the two cars
            var DistSqr = (Cars[i].X - Cars[j].X) * (Cars[i].X - Cars[j].X)
                + (Cars[i].Y - Cars[j].Y) * (Cars[i].Y - Cars[j].Y);
                
            if (Math.sqrt(DistSqr) <= 2 * GP.CarRadius)
            {
                // The impulses from a two dimensional elastic collision
                var DX = Cars[j].X - Cars[i].X;
                var DY = Cars[j].Y - Cars[i].Y;
                
                var Delta = (DX * (Cars[i].VX - Cars[j].VX)
                    + DY * (Cars[i].VY - Cars[j].VY)) / (DX * DX + DY * DY);
                    
                if (Delta <= 0)
                {
                    continue;
                }
                
                Impulses.push([i, j, Delta * DX, Delta * DY]);
            }
        }
    }
	
	// Apply impulses
    for (var i = 0; i < Impulses.length; i++)
    {
        if (Impulses[i][0] in Cars)
        {
            Cars[Impulses[i][0]].VX -= Impulses[i][2];
            Cars[Impulses[i][0]].VY -= Impulses[i][3];
        }
        
        if (Impulses[i][1] in Cars)
        {
            Cars[Impulses[i][1]].VX += Impulses[i][2];
            Cars[Impulses[i][1]].VY += Impulses[i][3];
        }
    }
	
	// Enforce speed limit and apply friction
    for (var i = 0; i < Cars.length; i++)
    {
        // Scale down cars speed if it is breaking the speed limit
        var Speed = Math.sqrt(Cars[i].VX * Cars[i].VX + Cars[i].VY * Cars[i].VY);
        
        if (Speed >= GP.MaxSpeed)
        {
            Cars[i].VX *= GP.MaxSpeed / Speed;
            Cars[i].VY *= GP.MaxSpeed / Speed;
        }
        
        // Friction will act on all cars
        Cars[i].VX *= GP.FrictionMultiplier;
        Cars[i].VY *= GP.FrictionMultiplier;
    }
}

if (typeof exports !== "undefined")
{
	exports.GP = GP;
    exports.RunGameFrame = RunGameFrame;
}

