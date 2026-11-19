public class Rental{
    private final Customer customer;
    private final Vehicule vehicule; 
    private final RentalPeriod rentalPeriod;
    private RentalStatus status = RentalStatus.RESERVED;

    public Rental(Customer customer,Vehicule vehicule, RentalPeriod rentalPeriod){
         if (customer == null) {
            throw new IllegalArgumentException("Customer is required");
        }
        if (vehicule == null) {
            throw new IllegalArgumentException("Vehicle is required");
        }
        if (rentalPeriod == null) {
            throw new IllegalArgumentException("Rental period is required");
        }
        this.customer = customer;
        this.vehicule=vehicule;
        this.rentalPeriod=rentalPeriod;
    }

    public Customer getCustomer(){
        return customer;
    }

    public Vehicule getVehicule(){
        return vehicule;
    }

    public void deliver(){
        if(status!=RentalStatus.RESERVED){
            throw new IllegalStateException("Only a reserved  rental can be delivered");
        }
        status=RentalStatus.ACTIVE;
    }

    public RentalStatus getStatus(){
        return status;
    }

    public RentalPeriod getRentalPeriod(){
        return rentalPeriod;
    }

    

}